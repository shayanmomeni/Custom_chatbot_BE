// utils/chatgpt.js
const axios = require("axios");

/**
 * getChatGPTValidation
 *
 * Global Rules:
 *  1) If the user's answer is on-topic and sufficiently addresses the question, reply EXACTLY with "NEXT".
 *  2) If the answer is off-topic, too vague, or incomplete, reply with a brief guidance message (including an example) on how to improve.
 *  3) If the user appears confused or requests clarification, reply with "Let me clarify..." followed by a concise explanation and then repeat the question in quotes.
 *  4) Accept minor grammatical or spelling errors.
 *  5) If this is a repeated attempt (attemptCount > 1) and the answer remains on-topic, even if brief, reply with "NEXT".
 *
 * Step-Specific Overrides:
 *  - For step B2: The answer must be "yes" or "no" (case-insensitive).
 *  - For step C1: Any brief answer that indicates a decision (e.g., "dance", "shopping", "studying", "eating") should be accepted.
 *  - For step E: The answer must mention at least TWO distinct self-aspects from [confidence, laziness, selfish, shy] along with each aspect's preferred option.
 *         If not, reply with a brief guidance message that includes an example.
 */
async function getChatGPTValidation(currentQuestion, userResponse, currentStep, attemptCount) {
  try {
    let stepSpecificPrompt = "";

    if (currentStep === "B2") {
      stepSpecificPrompt = `
        [Step B2] The user must answer "yes" or "no" (case-insensitive).
        If a valid answer is provided, reply EXACTLY with "NEXT".
        Otherwise, provide a brief corrective message.
      `;
    } else if (currentStep === "C1") {
      stepSpecificPrompt = `
        [Step C1] Accept any brief answer that indicates a decision (e.g., "dance", "shopping", "studying", "eating").
        If the answer is relevant, reply EXACTLY with "NEXT".
      `;
    } else if (currentStep === "E") {
      stepSpecificPrompt = `
        [Step E] The answer must mention at least TWO distinct self-aspects from: "confidence", "laziness", "selfish", "shy",
        and for each aspect mentioned, state its preferred option.
        For example: "Selfish wants to buy online, while Shy prefers to go in person."
        If these conditions are met, reply EXACTLY with "NEXT". Otherwise, provide a brief guidance message with an example.
      `;
    }

    let repeatNote = "";
    if (attemptCount > 1) {
      repeatNote = `If this is a repeated attempt (attemptCount ${attemptCount}), and the answer is on-topic even if brief, please accept it by replying "NEXT".`;
    }

    const validationPrompt = `
      You are an AI validator for a specialized chatbot.
      
      Current Step: "${currentStep}"
      Question: "${currentQuestion}"
      User Answer: "${userResponse}"
      Attempt Count: ${attemptCount}
      
      Global Rules:
      1) If the user's answer is on-topic and sufficiently addresses the question, reply EXACTLY with "NEXT".
      2) If the answer is off-topic, too vague, or incomplete, reply with a brief guidance message (including an example) on how to improve.
      3) If the user appears confused or asks for clarification, reply with "Let me clarify..." followed by a concise explanation and then repeat the question in quotes.
      4) Accept minor grammatical or spelling mistakes.
      
      ${repeatNote}
      
      ${stepSpecificPrompt}
      
      Provide exactly one response now.
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: validationPrompt }],
        temperature: 0.4,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    if (!response.data?.choices?.length) {
      console.error("[ChatGPT] Error: No choices in response.");
      return { validationMessage: "Something went wrong. Please try again.", isValid: false };
    }

    let feedback = response.data.choices[0].message?.content?.trim() || "";
    if (!feedback) {
      console.error("[ChatGPT] Error: Empty content from GPT.");
      return { validationMessage: "Couldn't process your answer. Please try again.", isValid: false };
    }

    console.log(`[ChatGPT] Raw feedback: "${feedback}"`);

    if (feedback === "NEXT") {
      return { validationMessage: "", isValid: true };
    }

    if (feedback.toLowerCase().startsWith("let me clarify")) {
      return { validationMessage: feedback, isValid: false };
    }

    return { validationMessage: feedback, isValid: false };

  } catch (error) {
    console.error("[ChatGPT] Error in validation:", error.message);
    return { validationMessage: "Something went wrong. Please try again.", isValid: false };
  }
}

module.exports = { getChatGPTValidation };
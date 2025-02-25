// utils/chatgpt.js
const axios = require("axios");

/**
 * getChatGPTValidation
 *
 * Global Rules:
 *  1) If the user's answer is correct or sufficiently relevant, respond EXACTLY "NEXT".
 *  2) If the user is confused or explicitly needs clarity, respond with:
 *       "Let me clarify..." + short explanation + repeat the question in quotes.
 *  3) Otherwise, respond with a short line explaining how to fix the answer.
 *
 * Step-Specific Overrides:
 *  - For step B2: The answer must be "yes" or "no".
 *  - For step C1: Any short answer (even a single word like "dance", "shopping", "studying") that indicates a decision should be accepted as valid (i.e. reply "NEXT").
 *  - For step E: The answer must mention at least TWO self-aspects from [confidence, laziness, selfish, shy] plus each aspect's preferred option.
 *    If not, reply with an example guidance message.
 *
 * You can add similar overrides for other steps as needed.
 */
async function getChatGPTValidation(currentQuestion, userResponse, currentStep) {
  try {
    let stepSpecificPrompt = "";

    if (currentStep === "B2") {
      stepSpecificPrompt = `
        For step B2, the user must answer "yes" or "no". 
        If the user provides a valid "yes" or "no" (case-insensitive), respond with EXACTLY "NEXT".
        Otherwise, provide a short fix message.
      `;
    } else if (currentStep === "C1") {
      stepSpecificPrompt = `
        For step C1, any short answer—even a single word that indicates a decision (e.g., "dance", "shopping", "studying", "eating")—should be accepted as valid. 
        In such cases, respond EXACTLY with "NEXT" without asking for additional details, unless the answer is completely off-topic.
      `;
    } else if (currentStep === "E") {
      stepSpecificPrompt = `
        For step E, the user must mention at least TWO different self-aspects from: "confidence", "laziness", "selfish", "shy".
        For each aspect mentioned, they must state its preferred option (e.g., "Selfish wants to buy online, while Shy prefers to go in person.").
        If the requirements are met, respond with EXACTLY "NEXT".
        If not, respond with a short guidance message, for example:
          "We need at least two aspects. For example: 'Selfish wants to buy online, while Shy prefers to go in person.' Please try again."
      `;
    }

    // Global validation prompt combining general rules and any step-specific instructions.
    const validationPrompt = `
      You are an AI validator for a specialized chatbot.

      Current Step: "${currentStep}"
      Question: "${currentQuestion}"
      User Answer: "${userResponse}"

      Global Rules:
      1) If the user's answer is correct or sufficiently relevant, respond EXACTLY with "NEXT".
      2) If the user is confused or needs clarity, respond with "Let me clarify..." followed by a short explanation and then repeat the question in quotes.
      3) Otherwise, respond with a short line explaining how to fix the answer.

      Do NOT use labels like "Invalid:" or "Confused:".

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

    // If feedback is exactly "NEXT", the answer is valid.
    if (feedback === "NEXT") {
      return { validationMessage: "", isValid: true };
    }

    // If feedback starts with "Let me clarify", the user is confused.
    if (feedback.toLowerCase().startsWith("let me clarify")) {
      return { validationMessage: feedback, isValid: false };
    }

    // Otherwise, the answer is considered invalid.
    return { validationMessage: feedback, isValid: false };

  } catch (error) {
    console.error("[ChatGPT] Error in validation:", error.message);
    return { validationMessage: "Something went wrong. Please try again.", isValid: false };
  }
}

module.exports = { getChatGPTValidation };
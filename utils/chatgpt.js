// utils/chatgpt.js
const axios = require("axios");

/**
 * getChatGPTValidation
 *
 * This function validates the user's answer for a given step in our decision-reflection chatbot.
 *
 * Project Overview:
 *   Our project, "Decent Chatbot", guides users through a structured conversation about their decisions.
 *   For each step, the user's response must meet a specific requirement (for example, a yes/no answer,
 *   a brief decision, a personal reflection, or the mentioning of at least two self-aspects with an action).
 *
 * Your Role as the Validator:
 *   - If the user's response fully meets the requirement, you must reply EXACTLY with "NEXT".
 *   - If the response is off-topic, too vague, or incomplete, provide a short, friendly prompt that guides
 *     the user to improve their answer. Do not include any internal details or technical terms (like "step E").
 *   - Accept minor typos, synonyms, and variations.
 *   - If attemptCount > 1, be more lenient.
 *
 * Step-Specific Rules:
 *   - B2: The answer must be "yes" or "no".
 *   - C1: Accept any short decision (e.g., "eating", "shopping").
 *   - D: Must answer "yes" or "no".
 *   - E: The answer must mention at least two distinct self-aspects (using synonyms like "side" or "part" is acceptable)
 *        along with a brief action or plan for each.
 *   - F: The answer must be a genuine personal description of the user's feelings (e.g., "I feel bad...", "it feels strange...").
 *   - X: This is the final step; any answer is accepted.
 *
 * Global Rule:
 *   Always provide exactly one response. If the answer meets the step requirement, reply "NEXT".
 *   Otherwise, provide a short, user-friendly message to help the user improve their answer.
 */
async function getChatGPTValidation({
  currentQuestion,
  userResponse,
  currentStep,
  attemptCount,
  userAspects = []
}) {
  try {
    let stepSpecificPrompt = "";

    if (currentStep === "B2") {
      stepSpecificPrompt = `
        The user must answer "yes" or "no" (case-insensitive).
        If valid, reply EXACTLY "NEXT".
        Otherwise, provide a short friendly prompt asking for a yes/no answer.
      `;
    } else if (currentStep === "C1") {
      stepSpecificPrompt = `
        Accept any brief answer that indicates a decision (e.g. "eating", "shopping", "studying").
        If the answer is relevant, reply EXACTLY "NEXT".
      `;
    } else if (currentStep === "D") {
      stepSpecificPrompt = `
        The user must answer "yes" or "no" (case-insensitive).
        If valid, reply EXACTLY "NEXT".
        Otherwise, provide a short prompt asking for a yes/no answer.
      `;
    } else if (currentStep === "E") {
      const aspectListStr = userAspects.join(", ") || "none listed";
      stepSpecificPrompt = `
        The user has these custom self-aspects: ${aspectListStr}.
        They must mention at least TWO distinct self-aspects along with an associated action or plan
        (using synonyms such as "wants to", "would like to", "prefers to", "asks", etc.).
        If this is done, reply EXACTLY "NEXT".
        Otherwise, provide a short friendly prompt asking them to clearly mention at least two aspects and what each intends to do.
      `;
    } else if (currentStep === "F") {
      stepSpecificPrompt = `
        For step F, the user must describe their personal feelings about having conflicting views.
        Accept any sincere, personal description (e.g. "I feel bad", "it feels strange").
        If the response is genuine, reply EXACTLY "NEXT".
        Otherwise, provide a short prompt encouraging a personal reflection.
      `;
    } else if (currentStep === "X") {
      stepSpecificPrompt = `
        This is the final step. Accept any user input and reply EXACTLY "NEXT" without further prompting.
      `;
    }

    let repeatNote = "";
    if (attemptCount > 1) {
      repeatNote = `If basically correct, reply "NEXT".`;
    }

    const validationPrompt = `
      You are an AI validator for "Decent Chatbot", a decision-reflection chatbot that guides users through a structured conversation.
      
      Your role is to check whether the user's response meets the specific requirements for each step.
      
      Project Context:
      - The chatbot asks questions about a decision the user is facing and requests personal reflections.
      - For each step, if the response meets the requirement, you must reply EXACTLY "NEXT".
      - Otherwise, you provide a short, friendly prompt to help the user improve their answer.
      
      Current Step: "${currentStep}"
      Question: "${currentQuestion}"
      User Answer: "${userResponse}"
      Attempt Count: ${attemptCount}
      
      Global Rules:
      1) If the user's answer meets the requirement for this step, reply EXACTLY "NEXT".
      2) Otherwise, reply with a short, friendly guidance message (including an example if appropriate) to help the user improve.
      3) Accept minor typos, synonyms, and variations in phrasing.
      4) If attemptCount > 1, be more lenient.
      
      ${repeatNote}
      ${stepSpecificPrompt}
      
      Provide EXACTLY one response.
    `;

    const responseGPT = await axios.post(
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
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    if (!responseGPT.data?.choices?.length) {
      console.error("[ChatGPT] Error: No choices from GPT.");
      return { validationMessage: "Something went wrong (no GPT output).", isValid: false };
    }

    const feedback = responseGPT.data.choices[0].message?.content?.trim() || "";
    console.log(`[ChatGPT] Raw feedback: "${feedback}"`);

    if (!feedback) {
      console.error("[ChatGPT] Error: GPT feedback is empty.");
      return { validationMessage: "Empty GPT response.", isValid: false };
    }

    if (feedback === "NEXT") {
      return { validationMessage: "", isValid: true };
    }
    if (feedback.toLowerCase().startsWith("let me clarify")) {
      return { validationMessage: feedback, isValid: false };
    }
    return { validationMessage: feedback, isValid: false };

  } catch (error) {
    console.error("[ChatGPT] Error in validation:", error.message);
    return { validationMessage: "GPT validation error. Please try again.", isValid: false };
  }
}

module.exports = { getChatGPTValidation };
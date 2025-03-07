// utils/chatgpt.js
const axios = require("axios");

/**
 * getChatGPTValidation
 *
 * This function validates the user's answer for a given step in our decision-reflection chatbot.
 *
 * Project Overview:
 *   "Decent Chatbot" guides users through a structured conversation about their decisions.
 *   For each step, your role is to check if the user's answer meets the specific requirements.
 *
 * General Rules:
 *   - If the user's answer meets the step requirement, reply EXACTLY with "NEXT".
 *   - Otherwise, reply with a short, friendly prompt to guide the user.
 *   - Accept minor typos, synonyms, and variations.
 *   - If attemptCount > 1, be more lenient.
 *
 * Step-Specific Instructions:
 *   - B2: Must answer "yes" or "no".
 *   - C1: Accept any brief decision (e.g. "eating", "shopping").
 *   - D: Must answer "yes" or "no".
 *   - E: The answer must mention at least TWO distinct self-aspects along with an associated action/plan.
 *   - F: The answer must be a genuine personal reflection (e.g. "I feel bad…", "it feels strange…").
 *   - H: The user is asked whether they want to brainstorm an alternative.
 *        *If the user answers "no" (i.e. no brainstormed idea), reply EXACTLY with "NEXT" (do not include any extra text).
 *   - X: This is the final step; accept any user input and reply EXACTLY with "NEXT".
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
        Otherwise, provide a short friendly prompt.
      `;
    } else if (currentStep === "C1") {
      stepSpecificPrompt = `
        Accept any brief answer that indicates a decision (e.g., "eating", "shopping", "studying").
        If relevant, reply EXACTLY "NEXT".
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
        (using synonyms like "prefers to", "wants to", "would like to", etc.).
        If this is done, reply EXACTLY "NEXT".
        Otherwise, provide a short friendly prompt asking them to clearly mention at least two aspects with their actions.
      `;
    } else if (currentStep === "F") {
      stepSpecificPrompt = `
        For step F, the user must describe their personal feelings about having conflicting views.
        Accept any sincere personal reflection (e.g., "I feel bad", "it feels strange").
        If the response is genuine, reply EXACTLY "NEXT".
        Otherwise, provide a short prompt encouraging a personal description.
      `;
    } else if (currentStep === "H") {
      // IMPORTANT: For step H, if the user answers "no" (indicating no brainstormed idea),
      // the reply MUST be exactly "NEXT" with no extra text.
      stepSpecificPrompt = `
        For step H, if the user answers "no" (i.e., they do not provide a brainstormed idea), 
        reply EXACTLY "NEXT" without any extra text.
        If they provide a brainstormed idea, ensure that the response is acceptable and then reply "NEXT".
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
      
      Your role is to validate the user's answer for each step.
      
      Project Context:
      - The chatbot asks predefined questions to help the user reflect on their decision.
      - If the user's answer meets the step requirement, you must reply EXACTLY "NEXT".
      - Otherwise, provide a short, friendly prompt (with an example if needed) to guide the user.
      - Minor typos, synonyms, and varied writing styles are acceptable.
      - For attemptCount > 1, be more lenient.
      
      Current Step: "${currentStep}"
      Question: "${currentQuestion}"
      User Answer: "${userResponse}"
      Attempt Count: ${attemptCount}
      
      Global Rules:
      1) If the user's answer fully meets the requirement for this step, reply EXACTLY "NEXT".
      2) Otherwise, reply with a short, friendly guidance message.
      
      ${repeatNote}
      ${stepSpecificPrompt}
      
      Provide EXACTLY one response.
    `;

    const responseGPT = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        // model: "gpt-4",
        // messages: [{ role: "system", content: validationPrompt }],
        // temperature: 0.4,
        // max_tokens: 500,
        // top_p: 1,
        // frequency_penalty: 0,
        // presence_penalty: 0
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: validationPrompt }],
        temperature: 0.4,
        max_tokens: 300,
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
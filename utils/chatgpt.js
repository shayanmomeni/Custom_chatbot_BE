// utils/chatgpt.js
const axios = require("axios");

/**
 * Helper to remove surrounding quotation marks from a string.
 */
function removeSurroundingQuotes(text) {
  return text.replace(/^["']|["']$/g, '');
}

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
 *   - Otherwise, reply with a short, friendly guidance message.
 *   - Accept minor typos, synonyms, and variations.
 *   - If attemptCount > 1, be more lenient.
 *
 * Step-Specific Instructions:
 * 
 * Step B2 (Initial Yes/No Question):
 *   • The user must answer “yes” or “no” (case-insensitive).
 *   • If valid, reply EXACTLY “NEXT”.
 *   • Otherwise, provide a short, friendly prompt.
 * 
 * Step C1 (Decision Input):
 *   • Accept any brief answer that indicates a decision (e.g., “eating”, “shopping”, “studying”).
 * 
 * Step C2 (Listing Options – part of the decision setup):
 *   • If the answer appears incomplete, reply EXACTLY with "Please provide complete answer in one text".
 *   • Otherwise, if the answer is complete, reply EXACTLY "NEXT".
 * 
 * Step D (Inner Disagreement – Yes/No):
 *   • The user must answer “yes” or “no” (case-insensitive).
 *   • If valid, reply EXACTLY "NEXT".
 *   • Otherwise, provide a prompt asking for a yes/no answer.
 * 
 * Step E (Disagreeing Self-aspects & Preferred Options):
 *   • The answer must mention at least TWO distinct self-aspects along with an associated action or plan (using phrases like "prefers to", "wants to", "would like to", etc.).
 *   • Users should only name self-aspects from the following list: [${userAspects.join(", ")}]. Otherwise, ask them to pick a self-aspect from the list.
 *   • If the answer seems incomplete or missing details, reply EXACTLY with "Please provide complete answer in one text".
 *   • Otherwise, if complete, reply EXACTLY "NEXT".
 * 
 * Step E1 (Perspectives of Self-aspects):
 *   • Accept any answer provided by the user.
 * 
 * Step E2 (Reasons for Not Preferring the Other Option):
 *   • Accept any answer provided by the user.
 * 
 * Step F (Personal Feelings):
 *   • Accept the answer if it is in context even if it is very short or just one word.
 * 
 * Step G (Prioritized Self-aspect Identification):
 *   • Users should only name self-aspects from the following list: [${userAspects.join(", ")}]. Otherwise, ask them to pick a self-aspect from the list.
 * 
 * Step H (Alternative/Brainstormed Option):
 *   • If the user answers "no" (i.e. no brainstormed idea), reply EXACTLY with "NEXT" (do not include any extra text).
 * 
 * Step J (Single Self-aspect Conflict – Yes/No):
 *   • The user must answer “yes” or “no” (case-insensitive).
 *   • If valid, reply EXACTLY "NEXT".
 *   • Otherwise, provide a short, friendly prompt.
 * 
 * Step K (Naming the Conflicting Self-aspect):
 *   • Users should only name self-aspects from the following list: [${userAspects.join(", ")}]. Otherwise, ask them to pick a self-aspect from the list.
 * 
 * Step L (Feelings About the Conflict):
 *   • Accept the answer if it is in context even if it is very short or just one word.
 * 
 * Step O (Alignment with Self-aspects – No Conflict):
 *   • Accept the answer if it is in context even if it is very short or just one word.
 * 
 * Step P1 (Most Aligned Self-aspect Identification):
 *   • Users should only name self-aspects from the following list: [${userAspects.join(", ")}]. Otherwise, ask them to pick a self-aspect from the list.
 * 
 * Step X (Final Reflection):
 *   • The question is: 
 *     "Final Reflection: Do you feel more confident in making choices that align with your values after our conversation? If yes, why?"
 *   • If the user's answer is simply "yes" without any additional explanation, reply EXACTLY with "Please provide complete answer in one text".
 *   • If the user provides a reason along with "yes" or gives any other complete answer, reply EXACTLY "NEXT".
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
        Otherwise, provide a short, friendly prompt.
      `;
    } else if (currentStep === "C1") {
      stepSpecificPrompt = `
        Accept any brief answer that indicates a decision (e.g., "eating", "shopping", "studying").
      `;
    } else if (currentStep === "C2") {
      stepSpecificPrompt = `
        For step C2 (Listing Options):
        If the answer appears incomplete, reply EXACTLY with "Please provide complete answer in one text".
        Otherwise, if the answer is complete, reply EXACTLY "NEXT".
      `;
    } else if (currentStep === "D") {
      stepSpecificPrompt = `
        The user must answer "yes" or "no" (case-insensitive).
        If valid, reply EXACTLY "NEXT".
        Otherwise, provide a prompt asking for a yes/no answer.
      `;
    } else if (currentStep === "E") {
      const aspectListStr = userAspects.join(", ") || "none listed";
      stepSpecificPrompt = `
        For step E (Disagreeing Self-aspects & Preferred Options):
        The answer must mention at least TWO distinct self-aspects along with an associated action or plan (using phrases like "prefers to", "wants to", "would like to", etc.).
        Users should only name self-aspects from the following list: [${aspectListStr}]. Otherwise, ask them to pick a self-aspect from the list.
        If the answer seems incomplete or missing details, reply EXACTLY with "Please provide complete answer in one text".
        Otherwise, if complete, reply EXACTLY "NEXT".
      `;
    } else if (currentStep === "E1") {
      stepSpecificPrompt = `
        Accept any answer provided by the user.
      `;
    } else if (currentStep === "E2") {
      stepSpecificPrompt = `
        Accept any answer provided by the user.
      `;
    } else if (currentStep === "F") {
      stepSpecificPrompt = `
        Accept the answer if it is in context, even if it is very short or just one word.
      `;
    } else if (currentStep === "G") {
      const aspectListStr = userAspects.join(", ") || "none listed";
      stepSpecificPrompt = `
        Users should only name self-aspects from the following list: [${aspectListStr}]. Otherwise, ask them to pick a self-aspect from the list.
      `;
    } else if (currentStep === "H") {
      stepSpecificPrompt = `
        For step H (Alternative/Brainstormed Option), if the user answers "no" (i.e. no brainstormed idea), reply EXACTLY with "NEXT" (do not include any extra text).
      `;
    } else if (currentStep === "J") {
      stepSpecificPrompt = `
        The user must answer "yes" or "no" (case-insensitive).
        If valid, reply EXACTLY "NEXT".
        Otherwise, provide a short, friendly prompt.
      `;
    } else if (currentStep === "K") {
      const aspectListStr = userAspects.join(", ") || "none listed";
      stepSpecificPrompt = `
        Users should only name self-aspects from the following list: [${aspectListStr}]. Otherwise, ask them to pick a self-aspect from the list.
      `;
    } else if (currentStep === "L") {
      stepSpecificPrompt = `
        Accept the answer if it is in context, even if it is very short or just one word.
      `;
    } else if (currentStep === "O") {
      stepSpecificPrompt = `
        Accept the answer if it is in context, even if it is very short or just one word.
      `;
    } else if (currentStep === "P1") {
      const aspectListStr = userAspects.join(", ") || "none listed";
      stepSpecificPrompt = `
        Users should only name self-aspects from the following list: [${aspectListStr}]. Otherwise, ask them to pick a self-aspect from the list.
      `;
    } else if (currentStep === "X") {
      stepSpecificPrompt = `
        For step X (Final Reflection):
        The question is: "Final Reflection: Do you feel more confident in making choices that align with your values after our conversation? If yes, why?"
        If the user's answer is simply "yes" without any additional explanation, reply EXACTLY with "Please provide complete answer in one text".
        If the user provides a reason along with "yes" or gives any other complete answer, reply EXACTLY "NEXT".
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
      - Otherwise, provide a short, friendly guidance message.
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

/**
 * fetchShortIdeaFromGPT
 *
 * This function extracts the core option from the provided text.
 * It sends a prompt to GPT and expects a short phrase in return.
 */
async function fetchShortIdeaFromGPT(originalText) {
  try {
    const systemPrompt = `
      You are an assistant whose ONLY job is to extract the single main option or idea
      from the user text, returning it in a short phrase without extra explanation.

      Example:
      If the user text is: "Joining a local book club could be a good alternative. It would allow me to meet new people..."
      You must ONLY return: "Joining a local book club"

      If the user text is: "I might sign up for yoga classes to meet new friends and stay healthy"
      You must ONLY return: "Sign up for yoga classes"

      User text:
      "${originalText}"
    `;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0,
        max_tokens: 50
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    let gptContent = response.data?.choices?.[0]?.message?.content?.trim();
    if (gptContent) {
      gptContent = removeSurroundingQuotes(gptContent);
      return gptContent;
    }
    return null;
  } catch (error) {
    console.error("[ChatGPT] Error extracting short idea:", error.message);
    return null;
  }
}

/**
 * fetchDecisionFromGPT
 *
 * Extracts only the core decision from the user text.
 */
async function fetchDecisionFromGPT(originalText) {
  try {
    const systemPrompt = `
      You are an assistant whose ONLY job is to extract the core decision from the user text, returning it in a short phrase without any additional commentary.

      Example:
      If the user text is: "I am thinking of going to the gym to stay fit", you must ONLY return: "going to the gym"

      User text:
      "${originalText}"
    `;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0,
        max_tokens: 50
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );
    let gptContent = response.data?.choices?.[0]?.message?.content?.trim();
    if (gptContent) {
      gptContent = removeSurroundingQuotes(gptContent);
      return gptContent;
    }
    return null;
  } catch (error) {
    console.error("[ChatGPT] Error extracting decision:", error.message);
    return null;
  }
}

/**
 * fetchOptionsFromGPT
 *
 * Extracts only the core options from the user text.
 */
async function fetchOptionsFromGPT(originalText) {
  try {
    const systemPrompt = `
      You are an assistant whose ONLY job is to extract the list of options mentioned in the text,
      returning them as a short, comma-separated list without extra explanation.

      Example:
      If the user text is: "exercising at home, going to gym with friends or going to gym alone",
      you must ONLY return: "exercising at home, going to gym with friends, going to gym alone"

      User text:
      "${originalText}"
    `;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0,
        max_tokens: 50
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );
    let gptContent = response.data?.choices?.[0]?.message?.content?.trim();
    if (gptContent) {
      gptContent = removeSurroundingQuotes(gptContent);
      return gptContent;
    }
    return null;
  } catch (error) {
    console.error("[ChatGPT] Error extracting options:", error.message);
    return null;
  }
}

/**
 * fetchFeelingsFromGPT
 *
 * Extracts only the exact feeling expressed in the user text.
 */
async function fetchFeelingsFromGPT(originalText) {
  try {
    const systemPrompt = `
      You are an assistant whose ONLY job is to extract the exact feeling expressed in the user text,
      returning it in a short phrase without any additional commentary.

      Example:
      If the user text is: "I feel bad", you must ONLY return: "bad"

      User text:
      "${originalText}"
    `;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0,
        max_tokens: 50
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );
    let gptContent = response.data?.choices?.[0]?.message?.content?.trim();
    if (gptContent) {
      gptContent = removeSurroundingQuotes(gptContent);
      return gptContent;
    }
    return null;
  } catch (error) {
    console.error("[ChatGPT] Error extracting feelings:", error.message);
    return null;
  }
}

module.exports = {
  getChatGPTValidation,
  fetchShortIdeaFromGPT,
  fetchDecisionFromGPT,
  fetchOptionsFromGPT,
  fetchFeelingsFromGPT
};
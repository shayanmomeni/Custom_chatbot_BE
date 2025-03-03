// utils/chatgpt.js
const axios = require("axios");

/**
 * getChatGPTValidation
 *
 * Accepts userAspects (an array of aspect names) for dynamic validation.
 *
 * Global Rules:
 *  1) If the user addresses the question well => EXACTLY "NEXT"
 *  2) If incomplete => short, user-friendly guidance (with an example). No mention of “step E” or “off-topic.”
 *  3) "Let me clarify..." only if the user is obviously confused.
 *  4) Minor typos are okay. The user doesn't need literal words like "prefers."
 *  5) If attemptCount > 1 => be more lenient if on-topic => "NEXT".
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

    /**
     * Example Step B2: user must say “yes” or “no”
     */
    if (currentStep === "B2") {
      stepSpecificPrompt = `
        The user must answer "yes" or "no" (case-insensitive).
        If valid => EXACTLY "NEXT".
        Otherwise => a short, user-friendly prompt asking them to say yes/no clearly.
      `;
    }
    /**
     * Example Step C1: any short decision is fine
     */
    else if (currentStep === "C1") {
      stepSpecificPrompt = `
        Accept any brief answer that indicates a decision (e.g. "dance", "shopping", "studying", "eating").
        If they provide any relevant decision => EXACTLY "NEXT".
      `;
    }
    /**
     * Step E: user must mention at least TWO aspects from userAspects,
     * each with some form of action or desire. They don't need to say "prefers" literally.
     */
    else if (currentStep === "E") {
      const aspectListStr = userAspects.join(", ") || "no stored aspects";
      stepSpecificPrompt = `
        The user has these custom self-aspects: ${aspectListStr}.
        They must mention at least TWO of these aspects AND indicate an action, desire, or decision for each one.
        
        For example, "My selfish aspect wants my mom to cook" and "My confident aspect likes to try new restaurants."
        They do NOT have to use the exact word "prefers"; synonyms like "wants," "would like," "chose," or "asks" are okay.
        
        If they do => EXACTLY "NEXT".
        Otherwise => provide a short user-friendly prompt like:
        "It looks like you didn't clearly mention two of your self-aspects or their actions. 
         Could you share at least two aspects and what each one does or wants? For example..."
         
        Avoid referencing step codes or saying 'off-topic.' Just be natural.
      `;
    }
    // Add more steps if needed...

    // Additional note for repeated attempts
    let repeatNote = "";
    if (attemptCount > 1) {
      repeatNote = `
        This is attemptCount = ${attemptCount}.
        If the user is basically on-topic (two aspects + any action),
        accept by replying "NEXT".
      `;
    }

    const validationPrompt = `
      You are a helpful AI validator for a chatbot.

      Current Step: "${currentStep}"
      Question: "${currentQuestion}"
      User Answer: "${userResponse}"
      Attempt Count: ${attemptCount}

      Global Rules:
      1) If the user's answer fully meets the requirement => EXACTLY "NEXT".
      2) If incomplete => short, friendly guidance (include an example).
      3) If user is confused => "Let me clarify..." + explanation, then repeat the question.
      4) Minor typos or synonyms are okay; no strict demand for "prefers."
      5) If attemptCount > 1 => be more lenient if it's basically correct => "NEXT".

      ${repeatNote}
      ${stepSpecificPrompt}

      Provide EXACTLY one response now, following these instructions.
    `;

    // Call GPT
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
      return { validationMessage: "Something went wrong (no GPT output).", isValid: false };
    }

    const feedback = response.data.choices[0].message?.content?.trim() || "";
    if (!feedback) {
      console.error("[ChatGPT] Error: Empty GPT content.");
      return { validationMessage: "Couldn't process your answer (GPT empty).", isValid: false };
    }

    console.log(`[ChatGPT] Raw feedback: "${feedback}"`);

    // If GPT says EXACTLY "NEXT", user is good
    if (feedback === "NEXT") {
      return { validationMessage: "", isValid: true };
    }
    // If GPT starts "Let me clarify", user is confused
    if (feedback.toLowerCase().startsWith("let me clarify")) {
      return { validationMessage: feedback, isValid: false };
    }
    // Otherwise, it's a short user-friendly message
    return { validationMessage: feedback, isValid: false };

  } catch (error) {
    console.error("[ChatGPT] Error in validation:", error.message);
    return {
      validationMessage: "Something went wrong with GPT. Please try again.",
      isValid: false
    };
  }
}

module.exports = { getChatGPTValidation };
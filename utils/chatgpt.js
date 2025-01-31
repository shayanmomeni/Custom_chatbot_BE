const axios = require("axios");

const getChatGPTValidation = async (currentQuestion, userResponse, currentStep) => {
  try {
    let validationPrompt = `
      You are a friendly AI validator for a chatbot. Validate if the user's response is relevant and correctly answers the question:
      "${currentQuestion}".

      Respond in the following format:
      - "Valid: [message]" if the response is correct.
      - "Invalid: [polite explanation of why the response is invalid, guiding the user to answer appropriately]".

      Keep responses short and polite.
    `;

    // Enforce Yes/No validation for Question 8
    if (currentStep === "yes_q8") {
      validationPrompt += `
      Important: This question only accepts responses like "Yes" or "No" (or slight variations like "yeah", "nope", etc.).
      If the user's response is not a variation of "Yes" or "No", return:
      "Invalid: Please answer with 'Yes' or 'No' to continue."
      `;
    }

    // Ensure logical consistency for Self-aspect-related questions
    if (["yes_q9", "yes_q10", "yes_q11", "yes_q12", "yes_q13", "yes_q14", "yes_q15", "yes_q16"].includes(currentStep)) {
      validationPrompt += `
      For this question, ensure the user is staying on topic and providing a relevant, meaningful response.
      If the response lacks explanation, ask politely for clarification.
      `;
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: validationPrompt },
          { role: "assistant", content: `Question: "${currentQuestion}"` },
          { role: "user", content: userResponse },
        ],
        temperature: 1,
        max_tokens: 300,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    if (response.data && response.data.choices.length > 0) {
      let feedback = response.data.choices[0].message.content.trim();
      feedback = feedback.replace(/^Invalid:\s*/i, "").replace(/^Valid:\s*/i, "");

      const isValid = response.data.choices[0].message.content.toLowerCase().startsWith("valid:");
      return { validationMessage: feedback, isValid };
    } else {
      return { validationMessage: "Unable to process your response.", isValid: false };
    }
  } catch (error) {
    console.error("[ChatGPT] Error during API call:", error.message);
    return { validationMessage: "Something went wrong during validation.", isValid: false };
  }
};

module.exports = { getChatGPTValidation };
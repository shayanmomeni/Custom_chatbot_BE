const axios = require("axios");

const getChatGPTValidation = async (currentQuestion, userResponse) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `
              You are a friendly conversational validator. Validate whether the user's response is relevant to the question:
              "${currentQuestion}".
              Respond as follows:
              - "Valid: [message]" if the response is correct.
              - "Invalid: [polite and conversational explanation of why the response is invalid, guiding the user to answer appropriately]".
              Keep responses concise but friendly.
            `,
          },
          {
            role: "assistant",
            content: `Question: "${currentQuestion}"`,
          },
          {
            role: "user",
            content: userResponse,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (response.data && response.data.choices.length > 0) {
      let feedback = response.data.choices[0].message.content.trim();

      // Remove "Invalid:" and "To continue:" from the feedback for a better user experience
      feedback = feedback.replace(/^Invalid:\s*/i, "").replace(/^To continue:\s*/i, "");

      const isValid = feedback.toLowerCase().startsWith("valid:");
      return { validationMessage: feedback.replace(/^Valid:\s*/i, "").trim(), isValid };
    } else {
      console.error("[ChatGPT] Invalid response format:", response.data);
      return { validationMessage: "Unable to process your response.", isValid: false };
    }
  } catch (error) {
    console.error("[ChatGPT] Error during API call:", error.message);
    return { validationMessage: "Something went wrong during validation.", isValid: false };
  }
};

module.exports = { getChatGPTValidation };
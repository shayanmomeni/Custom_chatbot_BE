const axios = require("axios");

const getChatGPTResponse = async (messages) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages,
        temperature: 0,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content.trim();
    } else {
      console.error("[ChatGPT] Invalid response format:", response.data);
      return "invalid";
    }
  } catch (error) {
    console.error("[ChatGPT] Error during API call:", error);
    return "invalid";
  }
};

module.exports = { getChatGPTResponse };
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getChatGPTResponse(messages) {
  try {
    console.log("[ChatGPT] Sending request with messages:", JSON.stringify(messages, null, 2));

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    console.log("[ChatGPT] Response received:", JSON.stringify(response, null, 2));

    return response.choices[0]?.message?.content.trim();
  } catch (error) {
    console.error("[ChatGPT] Error occurred:", error.message);
    throw new Error("Failed to fetch response from ChatGPT.");
  }
}

module.exports = { getChatGPTResponse };
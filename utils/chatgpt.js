const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getChatGPTResponse(messages, currentStep) {
  try {
    console.log("[ChatGPT] Sending request with messages:", JSON.stringify(messages, null, 2));

    const systemMessage = `
      You are a conversational assistant guiding users through a predefined flow of questions.
      Current step: ${currentStep}.
      Rules:
      1. Follow the predefined flow exactly as provided below:
      // Predefined questions here...
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: systemMessage }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    });

    console.log("[ChatGPT] Response received:", JSON.stringify(response, null, 2));

    return response.choices[0]?.message?.content.trim();
  } catch (error) {
    console.error("[ChatGPT] Error occurred:", error.message);
    throw new Error("Failed to fetch response from ChatGPT.");
  }
}

module.exports = { getChatGPTResponse };
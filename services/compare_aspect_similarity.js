const axios = require("axios");

/**
 * compareAspectSimilarity
 * 
 * Given two aspect strings, this function asks OpenAI whether they are conceptually equivalent.
 * It returns true if the concepts are the same, false otherwise.
 */
async function compareAspectSimilarity(aspect1, aspect2) {
  try {
    const prompt = `
You are an AI assistant specializing in natural language understanding. Compare the following two aspect names:
Aspect 1: "${aspect1}"
Aspect 2: "${aspect2}"
Determine if these two aspects represent the same concept (for example, "confident" and "confidence" should be considered the same). 
Return only "true" if they represent the same concept, otherwise return "false".
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.0,
        max_tokens: 10,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const feedback = response.data.choices[0].message?.content?.trim().toLowerCase() || "";
    // We expect either "true" or "false"
    return feedback === "true";
  } catch (error) {
    console.error("[compareAspectSimilarity] Error in GPT call:", error.message);
    return false;
  }
}

module.exports = { compareAspectSimilarity };
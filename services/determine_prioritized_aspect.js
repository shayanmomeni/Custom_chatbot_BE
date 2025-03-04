const axios = require("axios");

async function determinePrioritizedAspect(userText) {
  try {
    const prompt = `
You are an AI assistant specialized in natural language understanding. The following is a user's answer to a question asking which of their self-aspects is most important or has the highest priority. Analyze the sentence and return a JSON object with a single property "prioritizedAspect" containing only the name of that self-aspect. If you cannot clearly determine a self-aspect from the sentence, return an empty string.

For example, if the user says:
"my confident self is more important to me because it is the side of me that is more social and outgoing"
you should return:
{"prioritizedAspect": "confident"}

If the user's answer is: "${userText}"
return only the JSON.
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.0,
        max_tokens: 50,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    if (!response.data?.choices?.length) {
      console.error("[determinePrioritizedAspect] Error: No choices from GPT.");
      return "";
    }

    const feedback = response.data.choices[0].message?.content?.trim() || "";
    let result;
    try {
      result = JSON.parse(feedback);
    } catch (err) {
      console.error("[determinePrioritizedAspect] JSON parse error:", err.message);
      return "";
    }
    return result.prioritizedAspect || "";
  } catch (error) {
    console.error("[determinePrioritizedAspect] Error in GPT call:", error.message);
    return "";
  }
}

module.exports = { determinePrioritizedAspect };
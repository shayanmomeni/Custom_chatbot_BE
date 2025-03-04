const axios = require("axios");

async function determineBrainstormedIdea(userText) {
  try {
    const prompt = `
You are an AI assistant that determines if a user's response contains a clear alternative idea for brainstorming.
Analyze the following text:
"${userText}"
If the text clearly presents a brainstormed alternative idea, reply with a JSON object in the following format:
{
  "hasIdea": true,
  "idea": "<extracted idea>"
}
If the text does not present a clear alternative idea, reply with:
{
  "hasIdea": false,
  "idea": ""
}
Return only the JSON, without any additional text.
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.0,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    if (!response.data?.choices?.length) {
      console.error("[determineBrainstormedIdea] Error: No choices from GPT.");
      return { hasIdea: false, idea: "" };
    }

    const feedback = response.data.choices[0].message?.content?.trim() || "";
    let result;
    try {
      result = JSON.parse(feedback);
    } catch (err) {
      console.error("[determineBrainstormedIdea] JSON parse error:", err.message);
      return { hasIdea: false, idea: "" };
    }

    return result;
  } catch (error) {
    console.error("[determineBrainstormedIdea] Error in GPT call:", error.message);
    return { hasIdea: false, idea: "" };
  }
}

module.exports = { determineBrainstormedIdea };
const axios = require("axios");

/**
 * refineSelfAspects
 *
 * Given a raw text that contains self-aspect names (possibly with extra details),
 * this function asks OpenAI to extract only the names and return them as a comma-separated list.
 */
async function refineSelfAspects(rawText) {
  try {
    const prompt = `
You are an expert at extracting key information. Given the following text that may contain extra details about self-aspects, extract only the names of the self-aspects. Return the names as a comma-separated list.
    
Text: """${rawText}"""

Only return the comma-separated list of self-aspect names.
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
    
    const refined = response.data.choices[0].message?.content?.trim();
    return refined || rawText;
  } catch (error) {
    console.error("[refineSelfAspects] Error in GPT call:", error.message);
    return rawText;
  }
}

module.exports = { refineSelfAspects };
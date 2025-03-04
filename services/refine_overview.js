const axios = require("axios");

/**
 * refineOverview
 *
 * Given raw overview text, this function sends it to OpenAI with instructions to:
 * - Correct typos and improve clarity.
 * - Maintain consistency in language.
 * - Preserve key details.
 * - Leave the term "self-aspect" unchanged.
 *
 * IMPORTANT: For the "Involved Self-aspects" field, ensure that only the names of the self-aspects are included
 * (i.e. a clean list of names with no extra information).
 *
 * Additionally, if the overview corresponds to the case where the decision aligns with the user's self-aspects
 * (i.e. no general disagreement), then in the "Feelings" field, include only the answer provided to the alignment question.
 *
 * Return only the refined text.
 */
async function refineOverview(rawText) {
  try {
    const prompt = `
You are an expert editor. Refine the following overview text by correcting typos, improving clarity, and making the language consistent, without removing any key details. Do not change the term "self-aspect" anywhere in the text.

IMPORTANT:
1. In the "Involved Self-aspects" field, ensure that only the names of the self-aspects are included. Remove any extra descriptive information, leaving just a clean list of names.
2. If the overview corresponds to a case where the decision aligns with the user's self-aspects (i.e. there was no general disagreement), then in the "Feelings" field, include only the specific answer provided to "It sounds like your decision and options align well with your self-aspects. How do you feel about this alignment?"

Return only the refined text.

Overview text:
"""${rawText}"""
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.0,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const refined = response.data.choices[0].message?.content?.trim() || rawText;
    return refined;
  } catch (error) {
    console.error("[refineOverview] Error in GPT call:", error.message);
    return rawText;
  }
}

module.exports = { refineOverview };
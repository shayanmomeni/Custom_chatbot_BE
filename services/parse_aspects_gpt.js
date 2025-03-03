// services/parse_aspects_gpt.js
//
// This file calls GPT to parse self-aspects from a single user message.

const axios = require("axios");

async function parseAspectsWithGPT(userText) {
  try {
    // Provide GPT a system prompt to extract self-aspects from user text.
    const systemPrompt = `
      You are a helpful parser that extracts self-aspects and their preferences from user text.
      The user might say something like "My selfish aspect prefers to ask my mom to cook while my confident aspect wants to go out."
      Please return a valid JSON array of objects, each with "aspectName" and "preference".
      
      If the user text is: "${userText}"

      Example output (json only, no code):
      [
        {"aspectName": "selfish", "preference": "prefers to ask my mom to cook"},
        {"aspectName": "confident", "preference": "wants to go out"}
      ]

      1) Do not wrap in extra text, just raw JSON.
      2) aspectName is short, e.g. "selfish", "confident"
      3) preference is a short phrase describing what they want.
      4) If the user references multiple aspects in one sentence, parse them individually.
      5) If no aspects found, return "[]".
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.0,
        max_tokens: 250
      },
      {
        headers: { 
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, 
          "Content-Type": "application/json"
        },
      }
    );

    const gptOutput = response.data?.choices?.[0]?.message?.content?.trim() || "";
    // Attempt to parse the raw JSON
    let aspectsArray = [];
    try {
      aspectsArray = JSON.parse(gptOutput);
      // We expect an array of { aspectName, preference }
      if (!Array.isArray(aspectsArray)) {
        aspectsArray = [];
      }
    } catch (err) {
      console.error("[parseAspectsWithGPT] JSON parse error:", err.message);
      aspectsArray = [];
    }

    // Optionally remove leading "prefers to" or "wants to" from each preference
    aspectsArray.forEach(a => {
      // standardize aspect name to lowerCase
      if (a.aspectName) {
        a.aspectName = a.aspectName.toLowerCase().replace(/\s+/g, " ").trim();
      }
      if (a.preference) {
        a.preference = a.preference.trim();
      }
    });

    return aspectsArray;
  } catch (error) {
    console.error("[parseAspectsWithGPT] Error calling GPT:", error.message);
    return [];
  }
}

module.exports = { parseAspectsWithGPT };
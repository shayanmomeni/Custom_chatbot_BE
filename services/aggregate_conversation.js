const UserResponse = require("../models/UserResponse");
const Conversation = require("../models/Conversation");

/**
 * aggregateConversation
 *
 * Aggregates individual UserResponse documents for a given conversation
 * (identified by conversationId and userId) into a Conversation document.
 *
 * Key fields:
 *  - decision: from step C1.
 *  - options: from step C2.
 *  - selfAspects: from Branch A (E/E1/E2) or Branch B (K/O, etc.).
 *  - feelings: from step F (or L if F not provided).
 *  - finalIdea:
 *    -- If user says “no” at H => we take G’s answer.
 *    -- If user says “yes” at H => we use H1 as the final idea.
 *    -- If Branch B => from P, N, I3, I4, etc.
 *  - branch: "A" if user said “yes” at D, otherwise "B”.
 */
async function aggregateConversation(conversationId, userId) {
  try {
    const responses = await UserResponse.find({ conversationId, userId }).sort({ timestamp: 1 });
    if (!responses || responses.length === 0) return null;

    let decision = "";
    let options = [];
    let selfAspects = [];
    let feelings = "";
    let finalIdeaA = "";
    let finalIdeaB = "";
    let branch = ""; // "A" if D=yes, "B" if D=no

    // We'll track G’s answer, for use if user says "no" at H
    let prioritizedAspectAnswer = "";

    for (const resp of responses) {
      const { questionKey, response } = resp;

      switch (questionKey) {
        case "C1":
          decision = response;
          break;
        case "C2":
          options = response
            .split(/[,;]+/)
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0);
          break;
        case "D":
          branch = response.toLowerCase().trim() === "yes" ? "A" : "B";
          break;

        // Branch A
        case "E":
          if (response.includes("prefers")) {
            const parts = response.split(/[,;]+/);
            parts.forEach(part => {
              const [name, ...prefParts] = part.split("prefers");
              if (name && prefParts.length) {
                selfAspects.push({
                  aspectName: name.trim(),
                  preference: prefParts.join("prefers").trim()
                });
              }
            });
          } else {
            response.split(/[,;]+/).forEach(a => {
              if (a.trim().length) {
                selfAspects.push({ aspectName: a.trim(), preference: "" });
              }
            });
          }
          break;
        case "E1":
        case "E2":
          // Additional clarifications, no major changes to selfAspects
          break;

        case "F":
          feelings = response;
          break;
        case "G":
          prioritizedAspectAnswer = response;
          break;

        // CHANGED:
        // If user says "no" at H => finalIdeaA = G
        // If user says "yes" => aggregator expects final idea at H1
        case "H":
          if (response.toLowerCase().trim() === "no") {
            finalIdeaA = prioritizedAspectAnswer;
          }
          break;
        case "H1":
          finalIdeaA = response; 
          break;

        case "I":
        case "I1":
          // Possibly an extra final idea typed at the overview
          if (!finalIdeaA) {
            finalIdeaA = response;
          }
          break;

        // Branch B
        case "J":
          // yes => K, no => O
          break;
        case "K":
          if (response.toLowerCase().includes("self")) {
            const match = response.match(/(.*?self)\s*(?:because)?\s*(.*)/i);
            if (match) {
              const aspectName = match[1].trim();
              const preference = match[2].trim();
              selfAspects.push({ aspectName, preference });
            }
          } else {
            finalIdeaB = response;
          }
          break;
        case "L":
          if (!feelings) feelings = response;
          break;
        case "N":
          finalIdeaB = response;
          break;
        case "I3":
        case "I4":
        case "P":
          finalIdeaB = response;
          break;
        case "O":
          if (response && response.trim().length > 0) {
            let aspectName = response.replace(/^(with\s+)?(my\s+)?/i, "").trim();
            if (
              aspectName &&
              !selfAspects.find(sa => sa.aspectName.toLowerCase() === aspectName.toLowerCase())
            ) {
              selfAspects.push({ aspectName, preference: "" });
            }
          }
          break;
        default:
          break;
      }
    }

    // Combine final ideas from A/B
    const finalIdea = finalIdeaA || finalIdeaB || "";

    const conversationData = {
      conversationId,
      userId,
      decision,
      options,
      selfAspects,
      feelings,
      finalIdea,
      branch,
      createdAt: new Date()
    };

    const conversation = await Conversation.findOneAndUpdate(
      { conversationId, userId },
      conversationData,
      { upsert: true, new: true }
    );

    return conversation;
  } catch (error) {
    console.error("[Aggregate Conversation] Error:", error.message);
    throw error;
  }
}

module.exports = { aggregateConversation };
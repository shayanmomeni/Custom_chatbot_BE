// services/aggregate_conversation.js
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
 *  - selfAspects: from Branch A (steps E/E1) and Branch B (steps K and O).
 *    • For Branch A, the self-aspects come from question E.
 *    • For Branch B, the self-aspects are parsed from K and O.
 *  - feelings: from step F (or L if F is missing).
 *  - finalIdea: For Branch A, from H1 (or H2/I1/I); for Branch B, from P (or I3/I4/N if P is not provided).
 *    Branch A is preferred if available; otherwise Branch B.
 *  - branch: set to "A" if step D was answered "yes", "B" if "no".
 */
async function aggregateConversation(conversationId, userId) {
  try {
    const responses = await UserResponse.find({ conversationId, userId }).sort({ timestamp: 1 });
    if (!responses || responses.length === 0) return null;

    let decision = "";
    let options = [];
    let selfAspects = []; // Array of objects: { aspectName, preference }
    let feelings = "";
    let finalIdeaA = "";
    let finalIdeaB = "";
    let branch = ""; // "A" for yes flow, "B" for no flow

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
        case "E":
          // Branch A: capture self-aspects as provided in E.
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
              if (a.trim().length) selfAspects.push({ aspectName: a.trim(), preference: "" });
            });
          }
          break;
        case "E1":
          // For Branch A, we may update details if provided.
          // Here we choose NOT to override E so that the overview shows the original self-aspects.
          break;
        case "F":
          feelings = response;
          break;
        case "L":
          if (!feelings) feelings = response;
          break;
        case "H1":
        case "H2":
        case "I1":
        case "I":
          finalIdeaA = response;
          break;
        case "K":
          // Branch B: parse self-aspect info from K.
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
        case "O":
          // Branch B primary self-aspect.
          if (response && response.trim().length > 0) {
            let aspectName = response.replace(/^(with\s+)?(my\s+)?/i, "").trim();
            if (aspectName && !selfAspects.find(sa => sa.aspectName.toLowerCase() === aspectName.toLowerCase())) {
              selfAspects.push({ aspectName, preference: "" });
            }
          }
          break;
        case "P":
          // Branch B: final idea from P.
          finalIdeaB = response;
          break;
        case "I3":
        case "I4":
        case "N":
          finalIdeaB = response;
          break;
        default:
          break;
      }
    }

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
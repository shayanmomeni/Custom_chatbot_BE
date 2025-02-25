// services/aggregate_conversation.js
const UserResponse = require("../models/UserResponse");
const Conversation = require("../models/Conversation");

/**
 * aggregateConversation
 *
 * Aggregates individual UserResponse documents for a given conversation (identified by conversationId and userId)
 * into a Conversation document. The key fields are:
 *  - decision (from step C1)
 *  - options (from step C2, split into an array)
 *  - selfAspects (from steps E and E1; stored as an array of { aspectName, preference })
 *  - feelings (from step F)
 *  - finalIdea (from question G if available; otherwise from H1/H2/I1/I)
 */
async function aggregateConversation(conversationId, userId) {
  try {
    const responses = await UserResponse.find({ conversationId, userId }).sort({ timestamp: 1 });
    if (!responses || responses.length === 0) {
      return null;
    }

    let decision = "";
    let options = [];
    let selfAspects = []; // Array of objects { aspectName, preference }
    let feelings = "";
    let finalIdea = "";
    let finalIdeaFromG = "";

    responses.forEach((resp) => {
      switch (resp.questionKey) {
        case "C1":
          decision = resp.response;
          break;
        case "C2":
          options = resp.response
            .split(/[,;]+/)
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0);
          break;
        case "E":
          if (resp.response.includes("prefers")) {
            const parts = resp.response.split(/[,;]+/);
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
            const aspects = resp.response
              .split(/[,;]+/)
              .map(s => s.trim())
              .filter(s => s.length > 0);
            aspects.forEach(a => {
              selfAspects.push({ aspectName: a, preference: "" });
            });
          }
          break;
        case "E1":
          // If detailed explanation exists, override previous E responses.
          selfAspects = [];
          const items = resp.response.split(/[,;]+/);
          items.forEach(item => {
            const parts = item.split("prefers");
            if (parts.length >= 2) {
              selfAspects.push({
                aspectName: parts[0].trim(),
                preference: parts.slice(1).join("prefers").trim()
              });
            }
          });
          break;
        case "F":
          feelings = resp.response;
          break;
        case "G":
          // Capture question G's response for Final Idea.
          finalIdeaFromG = resp.response;
          break;
        case "H1":
        case "H2":
        case "I1":
        case "I":
          finalIdea = resp.response;
          break;
        default:
          break;
      }
    });

    // Use question G's response as finalIdea if it exists.
    if (finalIdeaFromG) {
      finalIdea = finalIdeaFromG;
    }

    const conversationData = {
      conversationId,
      userId,
      decision,
      options,
      selfAspects,
      feelings,
      finalIdea,
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

const UserResponse = require("../models/UserResponse");
const Conversation = require("../models/Conversation");

/**
 * aggregateConversation
 *
 * Aggregates individual UserResponse docs into a single Conversation doc.
 * 
 * Key update: We improved "parseAspectsAndPreferences" so that if the user says things
 * like "while my confident aspect prefers to go out," it strips "while", "my", etc.
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
    let branch = ""; // "A" if user said yes at D, else "B"

    let prioritizedAspectAnswer = "";
    let prioritizedAspectName = "";

    for (const resp of responses) {
      const { questionKey, response } = resp;
      const trimmedResp = response.trim();

      switch (questionKey) {
        case "C1":
          // e.g. "eating"
          if (trimmedResp) decision = trimmedResp;
          break;

        case "C2":
          // e.g. "// I cook, ask mum, go restaurent"
          {
            const arr = trimmedResp
              .split(/[,;]+/)
              .map(opt => opt.trim())
              .filter(opt => opt.length > 0);
            if (arr.length) options = arr;
          }
          break;

        case "D":
          // "yes" => branch A, "no" => branch B
          branch = trimmedResp.toLowerCase() === "yes" ? "A" : "B";
          break;

        /* ---------------------------
         * BRANCH A (D => yes)
         * --------------------------- */
        case "E":
          // e.g. "while my selfish aspect ask mum to cook, my confident aspect prefer go out"
          parseAspectsAndPreferences(trimmedResp, selfAspects);
          break;

        case "E1":
        case "E2":
          // additional clarifications, not stored
          break;

        case "F":
          // how the user feels about having these different views
          if (trimmedResp) feelings = trimmedResp;
          break;

        case "G":
          // user’s prioritized self-aspect
          prioritizedAspectAnswer = trimmedResp;
          {
            // attempt to find "selfish aspect" or "confident aspect" in user text
            let matchG = trimmedResp.match(/(selfish|confident|shy|laziness|[^\s]+ aspect)/i);
            if (matchG) {
              prioritizedAspectName = matchG[0].trim().toLowerCase();
            }
          }
          break;

        case "H":
          // If user says "no" => final idea is from G's aspect or text
          if (trimmedResp.toLowerCase() === "no") {
            let matchedAspect = null;
            if (prioritizedAspectName && selfAspects.length) {
              matchedAspect = selfAspects.find(sa =>
                sa.aspectName.toLowerCase().includes(prioritizedAspectName)
              );
            }
            if (matchedAspect && matchedAspect.preference) {
              finalIdeaA = matchedAspect.preference;
            } else {
              finalIdeaA = prioritizedAspectAnswer;
            }
          }
          break;

        case "H1":
          // user’s brainstormed idea
          if (trimmedResp) finalIdeaA = trimmedResp;
          break;

        case "I":
        case "I1":
          // final idea might appear here if we never set finalIdeaA
          if (!finalIdeaA && trimmedResp) finalIdeaA = trimmedResp;
          break;

        /* ---------------------------
         * BRANCH B (D => no)
         * --------------------------- */
        case "J":
          // yes => K, no => O
          break;

        case "K":
          // e.g. "my shy self aspect doesn't want to go out"
          if (trimmedResp.toLowerCase().includes("self")) {
            const match = trimmedResp.match(/(.*?self)\s*(?:because)?\s*(.*)/i);
            if (match) {
              const aspectName = match[1].trim();
              const preference = match[2].trim();
              selfAspects.push({ aspectName, preference });
            }
          } else {
            // fallback
            if (trimmedResp) finalIdeaB = trimmedResp;
          }
          break;

        case "L":
          // if user didn't fill F, store here
          if (!feelings && trimmedResp) feelings = trimmedResp;
          break;

        case "N":
          if (trimmedResp) finalIdeaB = trimmedResp;
          break;

        case "I3":
        case "I4":
        case "P":
          if (trimmedResp) finalIdeaB = trimmedResp;
          break;

        case "O":
          // user alignment aspect?
          if (trimmedResp) {
            let aspectName = trimmedResp.replace(/^(with\s+)?(my\s+)?/i, "").trim();
            if (
              aspectName &&
              !selfAspects.find(sa => sa.aspectName.toLowerCase() === aspectName.toLowerCase())
            ) {
              selfAspects.push({ aspectName, preference: "" });
            }
          }
          break;

        case "P1":
          // If you want to store how user feels about alignment
          // e.g. feelings += `[Alignment] ${trimmedResp}`;
          // or do nothing if not needed
          break;

        default:
          break;
      }
    }

    // Combine final ideas from branch A or B
    const finalIdea = finalIdeaA || finalIdeaB || "";

    // If user never provided these fields => store as empty
    if (!decision) decision = "";
    if (!feelings) feelings = "";

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

    // upsert the conversation doc
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

/**
 * parseAspectsAndPreferences
 *
 * Splits the user's text by commas and tries to parse aspectName + preference.
 * Now we remove leading "while", "and", "but", etc. to handle strings like
 * "while my confident aspect prefers ... "
 */
function parseAspectsAndPreferences(resp, selfAspectsArray) {
  // remove leading "//" and trim
  let cleaned = resp.replace(/^\/\/\s*/, "").trim();

  // split by commas
  const parts = cleaned.split(/[,;]+/);

  parts.forEach(part => {
    let trimPart = part.trim();

    // remove possible filler words at the start, e.g. "while", "and", "but"
    trimPart = trimPart.replace(/^while\s+/i, "");
    trimPart = trimPart.replace(/^and\s+/i, "");
    trimPart = trimPart.replace(/^but\s+/i, "");
    // remove leading "my "
    trimPart = trimPart.replace(/^my\s+/i, "");

    // attempt to find "confident aspect", "selfish aspect", etc.
    let matchAspect = trimPart.match(/(selfish|confident|shy|laziness|[^\s]+ aspect)/i);
    let aspectName = matchAspect ? matchAspect[0].trim() : "aspect";

    // remove aspectName from the text => remainder is preference
    let remainder = trimPart.replace(aspectName, "").trim();

    // also remove leading "my" from aspectName if present
    aspectName = aspectName.replace(/^my\s+/i, "").trim();

    // remove leftover "my" or slashes from remainder
    remainder = remainder.replace(/^my\s+/i, "").replace(/^\/\//, "").trim();

    // store
    selfAspectsArray.push({
      aspectName,
      preference: remainder || ""
    });
  });
}

module.exports = { aggregateConversation };
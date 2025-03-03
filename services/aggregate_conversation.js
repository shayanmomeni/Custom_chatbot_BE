// services/aggregate_conversation.js

const UserResponse = require("../models/UserResponse");
const Conversation = require("../models/Conversation");
const { parseAspectsWithGPT } = require("./parse_aspects_gpt");

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
    let branch = ""; // "A" if D was yes, else "B"

    let prioritizedAspectAnswer = "";
    let prioritizedAspectName = "";

    for (const resp of responses) {
      const { questionKey, response } = resp;
      const trimmedResp = response.trim();

      switch (questionKey) {
        case "C1":
          decision = trimmedResp;
          break;
        case "C2":
          if (trimmedResp) {
            const arr = trimmedResp.split(/[,;]+/).map(x => x.trim()).filter(x => x);
            if (arr.length) options = arr;
          }
          break;
        case "D":
          branch = trimmedResp.toLowerCase() === "yes" ? "A" : "B";
          break;

        // Branch A
        case "E":
          // use GPT to parse aspects from entire user text
          {
            const gptAspects = await parseAspectsWithGPT(trimmedResp);
            // push each extracted aspect into selfAspects
            gptAspects.forEach(a => {
              selfAspects.push({
                aspectName: a.aspectName || "aspect",
                preference: a.preference || ""
              });
            });
          }
          break;
        case "E1":
        case "E2":
          // clarifications
          break;
        case "F":
          feelings = trimmedResp;
          break;
        case "G":
          prioritizedAspectAnswer = trimmedResp;
          // We might want GPT-based parse again, but for now we do a quick match
          {
            let match = trimmedResp.match(/(selfish|confident|shy|laziness|[^\s]+ aspect)/i);
            if (match) {
              prioritizedAspectName = match[0].trim().toLowerCase();
            }
          }
          break;
        case "H":
          // "no" => final idea from G's aspect
          if (trimmedResp.toLowerCase() === "no") {
            let matchedAspect = findAspectByName(selfAspects, prioritizedAspectName);
            if (matchedAspect && matchedAspect.preference) {
              finalIdeaA = stripPreface(matchedAspect.preference);
            } else {
              finalIdeaA = "";
            }
          }
          break;
        case "H1":
          // user’s brainstormed idea
          if (trimmedResp) finalIdeaA = trimmedResp;
          break;
        case "I":
        case "I1":
          if (!finalIdeaA && trimmedResp) finalIdeaA = trimmedResp;
          break;

        // Branch B
        case "J":
          break;
        case "K":
          // if you want GPT-based parse, you can do parseAspectsWithGPT
          // or if you prefer old logic, keep it
          {
            const gptAspects = await parseAspectsWithGPT(trimmedResp);
            if (gptAspects.length > 0) {
              gptAspects.forEach(a => {
                selfAspects.push({
                  aspectName: a.aspectName || "aspect",
                  preference: a.preference || ""
                });
              });
            } else {
              // fallback to old approach
              finalIdeaB = trimmedResp;
            }
          }
          break;
        case "L":
          if (!feelings) feelings = trimmedResp;
          break;
        case "N":
          finalIdeaB = trimmedResp;
          break;
        case "I3":
          if (trimmedResp) finalIdeaB = trimmedResp;
          break;
        case "O":
          // similarly we might parse with GPT or keep old logic
          break;
        case "P":
          finalIdeaB = trimmedResp;
          break;
        case "I4":
          finalIdeaB = trimmedResp;
          break;
        default:
          break;
      }
    }

    const finalIdea = finalIdeaA || finalIdeaB || "";
    // fill defaults
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

    const conversation = await Conversation.findOneAndUpdate(
      { conversationId, userId },
      conversationData,
      { upsert: true, new: true }
    );
    return conversation;
  } catch (err) {
    console.error("[Aggregate Conversation] Error:", err.message);
    throw err;
  }
}

/**
 * findAspectByName
 * 
 * Tries to find a self-aspect by partial name (like "confident")
 */
function findAspectByName(selfAspects, aspectNameLower) {
  if (!aspectNameLower) return null;
  return selfAspects.find(sa =>
    aspectNameLower.includes(sa.aspectName.toLowerCase()) ||
    sa.aspectName.toLowerCase().includes(aspectNameLower)
  );
}

/**
 * stripPreface
 * 
 * If preference is "prefers to go to a restaurant", we return "go to a restaurant".
 * If preference is "wants to do X", we return "do X".
 */
function stripPreface(pref = "") {
  let txt = pref.trim().toLowerCase();

  // remove leading "prefers to", "wants to"
  txt = txt.replace(/^prefers to\s*/i, "");
  txt = txt.replace(/^wants to\s*/i, "");
  // etc. you can add more synonyms
  // possibly remove "likes to" or "would like to"

  // return capitalized
  return capitalizeFirst(txt);
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str[0].toUpperCase() + str.slice(1);
}

module.exports = { aggregateConversation };
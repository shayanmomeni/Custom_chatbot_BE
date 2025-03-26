// shared/flow_logic.js
const mongoose = require("mongoose");
const UserResponse = require("../models/UserResponse");
const Conversation = require("../models/Conversation");
const { aggregateConversation } = require("../services/aggregate_conversation");
const { 
  fetchShortIdeaFromGPT, 
  fetchDecisionFromGPT, 
  fetchOptionsFromGPT, 
  fetchFeelingsFromGPT 
} = require("../utils/chatgpt");

const exampleVariationsC1 = [
  "For example, are you planning to go grocery shopping?",
  "For example, are you planning to eat dinner?",
  "For instance, are you planning to study?"
];

const exampleVariationsC2 = [
  "For example, if you're thinking about groceries, you might consider online ordering, visiting a physical store, or using a delivery service.",
  "For instance, if your decision involves shopping, you could shop in-person, buy online, or ask a friend to help.",
  "For example, if you are deciding how to handle errands, you could do them yourself, hire a service, or split them with a partner."
];

const FINAL_REFLECTION =
  "Final Reflection: Do you feel more confident in making choices that align with your values after our conversation? If yes, why?";

const predefinedQuestions = {
  B2: "",
  C1: "What decision are you thinking about right now? [EXAMPLE_C1]",
  C2: "Can you list three different options you might choose from for carrying out this decision? [EXAMPLE_C2]",
  D: "Does this decision bring up any inner disagreement between your self-aspects? (Yes/No)",

  // Branch A
  E: "Can you share the names of the disagreeing self-aspects and which options each one prefers?",
  E1: "Let's look at the perspectives of your self-aspects. Could you explain why each self-aspect leans toward its preferred option?",
  E2: "Can you also share what reasons these self-aspects have for not preferring the option favored by another?",
  F: "How do you feel about having these different views inside you? What does that feel like?",
  G: "In your present situation, which self-aspect feels more important or has higher priority than the others? Tell me why.",
  H: "Taking your prioritized self-aspect into account, can you think of an alternative that might help make both self-aspects happier? If yes, what is the alternative option and how can this make both self-aspects happier? (If not, we'll conclude with the option favored by your prioritized self-aspect.)",
  H1: "Final Idea set to the brainstormed option.",

  I1: `Thank you for chatting with us. Here is a summary of our conversation that may help guide your decision:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Decision: [Brainstormed Idea]`,
  I: `Thank you for chatting with us. Here is a summary of our conversation that may help guide your decision:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Decision: [Prioritized self-aspect's option]`,

  // Branch B
  J: "If the decision does not create a disagreement among your self-aspects as a whole, does it still clash with one particular self-aspect? (Yes/No)",
  K: "Can you name the self-aspect and tell me why it disagrees?",
  L: "How does it feel to notice this difference?",
  N: "What other option will better align with that self-aspect's needs and why?",
  
  I3: `Thank you for chatting with us. Here is a summary of our conversation that may help guide your decision:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Decision: [Brainstormed Idea]`,

  O: "It sounds like your decision and options align well with your self-aspects. How do you feel about this alignment?",
  P1: "With which one of your self-aspects does this decision align most, and why?",
  P: "Which option out of the three would that self-aspect choose, and why?",
  I4: `Thank you for chatting with us. Here is a summary of our conversation that may help guide your decision:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Decision: [Chosen option by most aligned self-aspect]`,

  W: "Reflection placeholder. This is handled in send_message.js to display 2 messages in a row.",
  X: "End: Thanks for chatting and reflecting with me. Good luck with your decision!",
  Z1: "End: No worries, feel free to come back anytime!"
};

// Helper functions for yes/no interpretation
function isAffirmative(response) {
  const lower = response.toLowerCase();
  return lower.includes("yes") && !lower.includes("no");
}

function isNegative(response) {
  const lower = response.toLowerCase();
  return lower.includes("no") && !lower.includes("yes");
}

function isAmbiguous(response) {
  const lower = response.toLowerCase();
  return lower.includes("yes") && lower.includes("no");
}

const getNextStep = (currentStep, userResponse) => {
  console.log(`[Flow Logic] Current Step: ${currentStep}, User Response: "${userResponse}"`);

  const flow = {
    B2: () => {
      if (isAmbiguous(userResponse)) return "B2";
      else if (isAffirmative(userResponse)) return "C1";
      else if (isNegative(userResponse)) return "Z1";
      else return "B2";
    },
    C1: () => "C2",
    C2: () => "D",
    D: () => {
      if (isAmbiguous(userResponse)) return "D";
      else if (isAffirmative(userResponse)) return "E";
      else if (isNegative(userResponse)) return "J";
      else return "D";
    },

    // Branch A
    E: () => "E1",
    E1: () => "E2",
    E2: () => "F",
    F: () => "G",
    G: () => "H",
    H: () => "H",
    H1: () => "I1",
    I1: () => "W",
    I: () => "W",

    // Branch B
    J: () => {
      if (isAmbiguous(userResponse)) return "J";
      else if (isAffirmative(userResponse)) return "K";
      else if (isNegative(userResponse)) return "O";
      else return "J";
    },
    K: () => "L",
    L: () => "N",
    N: () => "I3",
    I3: () => "W",
    O: () => "P1",
    P1: () => "P",
    P: () => "I4",
    I4: () => "W",

    W: () => "X",
    X: () => "end",
    Z1: () => "end"
  };

  const nextStep = flow[currentStep] ? flow[currentStep]() : "end";
  console.log(`[Flow Logic] Next Step: ${nextStep}`);
  return nextStep;
};

/**
 * Helper function to capitalize the first letter after each colon.
 * It looks for a colon followed by optional whitespace and a lowercase letter,
 * and ensures that letter is uppercase.
 */
function capitalizeOverviewFields(text) {
  return text.replace(/:\s*([a-z])/g, (match, letter) => {
    return ': ' + letter.toUpperCase();
  });
}

const populateDynamicPlaceholders = async (nextStep, userId, conversationId) => {
  try {
    let template = predefinedQuestions[nextStep];
    if (!template) return "End of flow.";
    console.log(`[Flow Logic] Populating template for step: ${nextStep}`);

    if (nextStep === "C2") {
      const randomIndex = Math.floor(Math.random() * exampleVariationsC2.length);
      const randomExample = exampleVariationsC2[randomIndex];
      template = template.replace("[EXAMPLE_C2]", randomExample);
    }
    if (nextStep === "C1") {
      const randomIndex = Math.floor(Math.random() * exampleVariationsC1.length);
      const randomExample = exampleVariationsC1[randomIndex];
      template = template.replace("[EXAMPLE_C1]", randomExample);
    }

    if (["I1", "I", "I3", "I4"].includes(nextStep)) {
      await aggregateConversation(conversationId, userId);
      const convo = await Conversation.findOne({ userId, conversationId });
      if (convo) {
        let decision = convo.decision 
          ? await stripDecision(convo.decision) 
          : "Not defined";
        let optionsListed = (convo.options && convo.options.length)
          ? await stripOptions(convo.options.join(", "))
          : "Not defined";
        let feelings = convo.feelings 
          ? await stripFeelings(convo.feelings) 
          : "Not defined";
        let finalIdea = convo.finalIdea 
          ? await stripFinalIdea(convo.finalIdea) 
          : "Not defined";
        
        let selfAspectsStr = "No self-aspects mentioned";
        if (convo.selfAspects && convo.selfAspects.length) {
          selfAspectsStr = convo.selfAspects.map(sa => sa.aspectName).join(", ");
        }

        template = template
          .replace("[User's decision]", decision)
          .replace("[Options listed]", optionsListed)
          .replace("[Self-aspects]", selfAspectsStr)
          .replace("[User's feelings]", feelings)
          .replace("[Brainstormed Idea]", finalIdea)
          .replace("[Chosen option by most aligned self-aspect]", finalIdea)
          .replace("[Prioritized self-aspect's option]", finalIdea);
      } else {
        console.warn("[Flow Logic] No aggregated conversation found for placeholders.");
        template = "Insufficient data to build overview.";
      }
    }

    // Capitalize the first letter of the word after each colon in the overview.
    template = capitalizeOverviewFields(template);
    return template;
  } catch (error) {
    console.error("[Flow Logic] Error in populateDynamicPlaceholders:", error.message);
    return predefinedQuestions[nextStep] || "End of flow.";
  }
};

/**
 * stripFinalIdea
 * 
 * Uses ChatGPT to extract the core option from the text.
 * If ChatGPT extraction fails, falls back to removing common leading phrases.
 */
async function stripFinalIdea(text) {
  if (!text) return text;

  const extracted = await fetchShortIdeaFromGPT(text);
  if (extracted && extracted.trim()) {
    return capitalizeFirst(extracted.trim());
  }

  let cleaned = text.replace(/^(prefers to|wants to|would like to)\s*/i, "").trim();
  return capitalizeFirst(cleaned);
}

/**
 * stripDecision
 * 
 * Uses ChatGPT to extract only the core decision from the provided text.
 */
async function stripDecision(text) {
  if (!text) return text;
  const extracted = await fetchDecisionFromGPT(text);
  if (extracted && extracted.trim()) {
    return capitalizeFirst(extracted.trim());
  }
  return capitalizeFirst(text);
}

/**
 * stripOptions
 * 
 * Uses ChatGPT to extract only the core options from the provided text.
 */
async function stripOptions(text) {
  if (!text) return text;
  const extracted = await fetchOptionsFromGPT(text);
  if (extracted && extracted.trim()) {
    return extracted.trim();
  }
  return text;
}

/**
 * stripFeelings
 * 
 * Uses ChatGPT to extract only the core feeling from the provided text.
 */
async function stripFeelings(text) {
  if (!text) return text;
  const extracted = await fetchFeelingsFromGPT(text);
  if (extracted && extracted.trim()) {
    return extracted.trim();
  }
  return text;
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  predefinedQuestions,
  getNextStep,
  populateDynamicPlaceholders,
  FINAL_REFLECTION
};
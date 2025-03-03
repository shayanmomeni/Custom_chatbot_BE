// shared/flow_logic.js
const mongoose = require("mongoose");
const UserResponse = require("../models/UserResponse");
const Conversation = require("../models/Conversation");
const { aggregateConversation } = require("../services/aggregate_conversation");

const exampleVariationsC2 = [
  "For example, if you're thinking about groceries, you might consider online ordering, visiting a physical store, or using a delivery service.",
  "For instance, if your decision involves shopping, you could shop in-person, buy online, or ask a friend to help.",
  "For example, if you are deciding how to handle errands, you could do them yourself, hire a service, or split them with a partner."
];

const FINAL_REFLECTION =
  "Final Reflection: Do you feel more confident in making choices that align with your values after our conversation? If yes, why?";

// We add \n\n to get extra blank lines in the multiline overview
const predefinedQuestions = {
  B2: "", // intentionally blank, code uses fallback
  C1: "What decision are you thinking about right now? (For example, are you planning to go grocery shopping?)",
  C2: "Can you list three different options you might choose from for carrying out this decision? [EXAMPLE_C2]",
  D: "Does this decision bring up any inner disagreement between your self-aspects? (Yes/No)",
  E: "Can you share the names of the disagreeing self-aspects and which options each one prefers?",
  E1: "Let's look at the perspectives of your self-aspects. Could you explain why each self-aspect leans toward its preferred option?",
  E2: "Can you also share what reasons these self-aspects have for not preferring the option favored by another?",
  F: "How do you feel about having these different views inside you? What does that feel like?",
  G: "In your present situation, which self-aspect feels more important or has higher priority than the others? Tell me why.",
  H: "Would you like to brainstorm a new idea that might help balance these views? (Yes/No)",
  H1: "Please share the new idea or action that balances your prioritized self-aspect with the others.",

  // Branch A Overviews
  I1: `Overview:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Idea: [Brainstormed Idea]`,
  I: `Overview:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Idea: [Prioritized self-aspect's option]`,

  J: "If the decision does not create a disagreement among your self-aspects as a whole, does it still clash with one particular self-aspect? (Yes/No)",
  K: "Can you name the self-aspect and tell me why it disagrees? What would it prefer to do instead, and why?",
  L: "How does it feel to notice this difference?",
  N: "What other option will better align with that self-aspect's needs and why?",

  // Branch B Overview for single opposing view
  I3: `Overview:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Idea: [Brainstormed Idea]`,

  O: "It sounds like your decision and options align well with your self-aspects. With which one of your self-aspects does this decision align most, and why?",

  // NEW: We add text for P1 from flowchart
  P1: "How do you feel about the fact that your decisions and options are aligned with your self-aspects?",

  P: "Which option out of the three would that self-aspect choose, and why?",

  // Branch B overview for fully aligned
  I4: `Overview:\n\nDecision: [User's decision]\n\nOptions: [Options listed]\n\nInvolved Self-aspects: [Self-aspects]\n\nFeelings: [User's feelings]\n\nFinal Idea: [Chosen option by most aligned self-aspect]`,

  // Reflection & End
  W: "Reflection placeholder. This is handled in send_message.js to display 2 messages in a row.",
  X: "End: Thanks for chatting and reflecting with me. Good luck with your decision!",
  Z1: "End: No worries, feel free to come back anytime!"
};

// Next step logic
const getNextStep = (currentStep, userResponse) => {
  console.log(`[Flow Logic] Current Step: ${currentStep}, User Response: ${userResponse}`);

  const flow = {
    B2: () => userResponse.toLowerCase().trim() === "yes" ? "C1" : "Z1",
    C1: () => "C2",
    C2: () => "D",
    D: () => userResponse.toLowerCase().trim() === "yes" ? "E" : "J",
    E: () => "E1",
    E1: () => "E2",
    E2: () => "F",
    F: () => "G",
    G: () => "H",
    H: () => userResponse.toLowerCase().trim() === "yes" ? "H1" : "I",
    H1: () => "I1",
    I1: () => "W",
    I: () => "W",

    J: () => userResponse.toLowerCase().trim() === "yes" ? "K" : "O",
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

// For overview steps, we do aggregator + placeholders
const populateDynamicPlaceholders = async (nextStep, userId, conversationId) => {
  try {
    let template = predefinedQuestions[nextStep];
    if (!template) return "End of flow.";
    console.log(`[Flow Logic] Populating template for step: ${nextStep}`);

    // Insert random example into C2
    if (nextStep === "C2") {
      const randomIndex = Math.floor(Math.random() * exampleVariationsC2.length);
      const randomExample = exampleVariationsC2[randomIndex];
      template = template.replace("[EXAMPLE_C2]", randomExample);
    }

    // aggregator for I1, I, I3, I4
    if (["I1", "I", "I3", "I4"].includes(nextStep)) {
      await aggregateConversation(conversationId, userId);
      const conversationDoc = await Conversation.findOne({ userId, conversationId });
      if (conversationDoc) {
        // If aggregator yields blank fields, show placeholders
        let decision = conversationDoc.decision || "Not defined";
        let feelings = conversationDoc.feelings || "Not defined";
        let finalIdea = conversationDoc.finalIdea || "Not defined";
        let selfAspectsStr = "No self-aspects mentioned";

        if (conversationDoc.selfAspects && conversationDoc.selfAspects.length) {
          selfAspectsStr = conversationDoc.selfAspects
            .map(sa => {
              let aspect = sa.aspectName || "aspect";
              let pref = sa.preference || "No preference";
              return `${aspect} (${pref})`;
            })
            .join(", ");
        }

        let optionsListed = "Not defined";
        if (conversationDoc.options && conversationDoc.options.length) {
          optionsListed = conversationDoc.options.join(", ");
        }

        // Replace placeholders in the template
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

    return template;
  } catch (error) {
    console.error("[Flow Logic] Error in populateDynamicPlaceholders:", error.message);
    return predefinedQuestions[nextStep] || "End of flow.";
  }
};

module.exports = {
  predefinedQuestions,
  getNextStep,
  populateDynamicPlaceholders,
  FINAL_REFLECTION
};
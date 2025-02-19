const mongoose = require("mongoose");
const UserResponse = require("../models/UserResponse");

const predefinedQuestions = {
  B2: "Would you like to take a moment to reflect on a decision you are facing at the moment?",
  C1: "What decision are you thinking about right now? (For example, are you planning to go grocery shopping?)",
  C2: "Can you list three different options you might choose from for carrying out this decision? (For instance, if you are shopping, you might consider ordering online, driving to the store yourself, or asking a friend to help.)",
  D: "Does this decision bring up any inner disagreement between your self-aspects? (For example, does one self-aspect prefer one option while another prefers a different one? Display the images) (Yes/No)",
  // Branch A: When an inner disagreement exists
  E: "Can you share the names of the disagreeing self-aspects and which options each one prefers?",
  E1: "Let's look at the perspectives of your self-aspects. Could you explain why each self-aspect leans toward its preferred option? For instance, why does Self-Aspect A prefer Option 1?",
  E2: "Can you also share what reasons these self-aspects have for not preferring the option favored by another? For example, why might Self-Aspect A not prefer the option preferred by Self-Aspect B or another self-aspect?",
  F: "How do you feel about having these different views inside you? What does that feel like?",
  G: "In your present situation, which self-aspect feels more important or has higher priority than the others? Tell me why.",
  H: "Taking your prioritized self-aspect into account, would you like to brainstorm an alternative that might help balance these views? Please share your idea if you have one. (If not, we'll use the option favored by your prioritized self-aspect.)",
  H1: "Final Idea set to the brainstormed option.",
  H2: "Final Idea set to the option favored by your prioritized self-aspect.",
  I1: "Overview: Decision: [User's decision] | Options: [Options listed] | Involved Self-Aspects: [Names provided] | Feelings: [User's feelings] | Final Idea: [Brainstormed Idea]",
  I: "Overview: Decision: [User's decision] | Options: [Options listed] | Involved Self-Aspects: [Names provided] | Feelings: [User's feelings] | Final Idea: [Prioritized self-aspect's option]",
  // Branch B: When no general disagreement is felt → Check for a strong opposing view
  J: "If the decision does not create a disagreement among your self-aspects as a whole, does it still clash with one particular self-aspect? (Yes/No)",
  K: "Can you name the self-aspect and tell me why it disagrees? What would it prefer to do instead, and why?",
  L: "How does it feel to notice this difference?",
  N: "What other option that will better align with that self-aspect's needs?",
  I3: "Overview: Decision: [User's decision] | Options: [Options listed] | Involved Self-Aspects: [Names provided] | Feelings: [User's feelings] | Final Idea: [Brainstormed Idea]",
  O: "It sounds like your decision and options align well with your self-aspects. With which one of your self-aspects does this decision align most, and why?",
  P: "Which option out of the three would that self-aspect choose, and why?",
  I4: "Overview: Decision: [User's decision] | Options: [Options listed] | Involved Self-Aspects: [Names provided] | Feelings: [User's feelings] | Final Idea: [Chosen option by most aligned self-aspect]",
  // Final Reflection and Conclusion
  W: "Final Reflection: How are you feeling about your decision now, after our conversation?",
  X: "End: Thanks for chatting and reflecting with me. Good luck with your decision!",
  Z1: "End: No worries, feel free to come back anytime!"
};

const getNextStep = (currentStep, userResponse) => {
  // Map legacy step "awaiting_time_response" to the new initial step "B2"
  if (currentStep === "awaiting_time_response") {
    currentStep = "B2";
  }

  const flow = {
    B2: () => userResponse.toLowerCase().trim() === "yes" ? "C1" : "Z1",
    C1: () => "C2",
    C2: () => "D",
    D: () => userResponse.toLowerCase().trim() === "yes" ? "E" : "J",
    // Branch A: Inner disagreement exists.
    E: () => "E1",
    E1: () => "E2",
    E2: () => "F",
    F: () => "G",
    G: () => "H",
    H: () => userResponse.toLowerCase().trim() === "yes" ? "H1" : "H2",
    H1: () => "I1",
    H2: () => "I",
    I1: () => "W",
    I: () => "W",
    // Branch B: No general disagreement.
    J: () => userResponse.toLowerCase().trim() === "yes" ? "K" : "O",
    K: () => "L",
    L: () => "N",
    N: () => "I3",
    I3: () => "W",
    O: () => "P",
    P: () => "I4",
    I4: () => "W",
    // Final steps.
    W: () => "X",
    X: () => "end",
    Z1: () => "end"
  };

  return flow[currentStep] ? flow[currentStep]() : "end";
};

const populateDynamicPlaceholders = async (nextStep, userId, conversationId) => {
  try {
    const template = predefinedQuestions[nextStep];
    if (!template) return "End of flow.";
    // No dynamic placeholders needed for the new flow.
    return template;
  } catch (error) {
    console.error("[Flow Logic] Error in populateDynamicPlaceholders:", error.message);
    return predefinedQuestions[nextStep] || "End of flow.";
  }
};

module.exports = { 
  predefinedQuestions, 
  getNextStep, 
  populateDynamicPlaceholders 
};
const mongoose = require("mongoose");
const UserResponse = require("../models/UserResponse");

const predefinedQuestions = {
  awaiting_time_response: "Do you have time? Please answer 'yes' or 'no'.",
  no_q1: "Ah, ok. Wieso nicht?",
  no_q2: "Verstehe. Wie fühlst du dich gerade?",
  no_q3: "Ok, ich frage später nochmal. Mach's gut. Du kannst unser Chatfenster jetzt schließen.",
  yes_q1: "Where are you?",
  yes_q2: "What are you doing?",
  yes_q3: "You are currently engaged in the following activity: **{activity}**. Consider the different ways you can approach this task. Which of these approaches would you consider?",
  yes_q4: "What options do you have within this choice? What could you do, for example?",
  yes_q5: "And what other option is there?",
  yes_q6: "Okay, what else could you do?",
  yes_q7: "Here are the images. Please choose one from the following options:",
  yes_q8: "Does this choice evoke conflicts between certain self-aspects? (Please answer Yes or No)",
  yes_q9: "Ah, why does this cause a conflict? Can you explain this from the perspective of Self-aspect A?",
  yes_q10: "Which option would she prefer?",
  yes_q11: "And how about Self-Aspects B, what is her perspective?",
  yes_q12: "What option would she prefer?",
  yes_q13: "How do you feel about this conflict between your self-aspects? Why is that?",
  yes_q14: "Is one of them more important to you, given the specific choice and situation? Why is that?",
  yes_q15: "Would you like to ideate options that would ease the conflict between both self-aspects? What could you change? Do you see alternative options that nurture both their needs?",
  yes_q16: "Is one of them more important to you, given the specific choice and situation? Why is that?",
  end: "Thank you for the conversation. Have a great day!",
};

const getNextStep = (currentStep, userResponse) => {
  const flow = {
    awaiting_time_response: () =>
      userResponse.toLowerCase().trim() === "yes" ? "yes_q1" : "no_q1",

    no_q1: () => "no_q2",
    no_q2: () => "no_q3",
    no_q3: () => "end",

    yes_q1: () => "yes_q2",
    yes_q2: () => "yes_q3",
    yes_q3: () => "yes_q4",
    yes_q4: () => "yes_q5",
    yes_q5: () => "yes_q6",
    yes_q6: () => "yes_q7", // Image step
    yes_q7: () => "yes_q8",
    yes_q8: () => (userResponse.toLowerCase().trim() === "yes" ? "yes_q9" : "end"),
    yes_q9: () => "yes_q10",
    yes_q10: () => "yes_q11",
    yes_q11: () => "yes_q12",
    yes_q12: () => "yes_q13",
    yes_q13: () => "yes_q14",
    yes_q14: () => "yes_q15",
    yes_q15: () => "yes_q16",
    yes_q16: () => "end",
  };

  return flow[currentStep] ? flow[currentStep]() : "end";
};

/**
 * Dynamically replace placeholders in the next question
 * e.g., {activity}, etc.
 */
const populateDynamicPlaceholders = async (nextStep, userId, conversationId) => {
  try {
    const template = predefinedQuestions[nextStep];
    if (!template) return "End of flow.";

    // If we have '{activity}' in the template, fetch from yes_q2
    if (template.includes("{activity}")) {
      const activityResponse = await UserResponse.findOne({
        userId,
        conversationId,
        questionKey: "yes_q2",
      });
      const activity = activityResponse?.response || "[activity not found]";
      console.log(
        `[Flow Logic] Retrieved activity "${activity}" for userId "${userId}" in conversationId "${conversationId}"`
      );

      // Replace all occurrences of {activity}
      return template.replace(/{activity}/g, activity);
    }

    // No placeholders to replace, return as is
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
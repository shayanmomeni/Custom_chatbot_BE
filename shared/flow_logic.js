const mongoose = require("mongoose");
const UserResponse = require("../models/UserResponse");

const predefinedQuestions = {
  awaiting_time_response: "Do you have time? Please answer 'yes' or 'no'.",
  no_q1: "Ah, ok. Wieso nicht?",
  no_q2: "Verstehe. Wie fühlst du dich gerade?",
  no_q3: "Ok, ich frage später nochmal. Mach's gut. Du kannst unser Chatfenster jetzt schließen.",
  yes_q1: "Where are you?",
  yes_q2: "Are you alone? If not, who is with you?",
  yes_q3: "What are you doing right now?",
  yes_q4: `How often do you do this per week? Options:
    a. Every day (at least 7 times)
    b. Almost daily (5–7 times)
    c. Often (3–5 times)
    d. Occasionally (1–2 times)
    e. Very rarely (less than 1 time)
    f. Never, this is an exception
    h. I don't know how to answer that.`,
  yes_q5: "Would you say this is a routine for you? Something you regularly do in daily life?",
  yes_q6: "So, you’re currently doing: »{activity answered in the 3rd question}«. Pick a decision within this activity that involves some degree of choice.",
  yes_q7: "What options do you have within this decision? For example, what could you do? And what other options are there? Okay, what else could you do?",
  end: "Thank you for the conversation. Have a great day!",
};

const getNextStep = (currentStep, userResponse) => {
  const flow = {
    awaiting_time_response: () => {
      const normalizedResponse = userResponse.toLowerCase().trim();
      if (normalizedResponse === "yes") return "yes_q1";
      if (normalizedResponse === "no") return "no_q1";
      return "awaiting_time_response"; // Re-ask if invalid
    },
    no_q1: () => "no_q2",
    no_q2: () => "no_q3",
    no_q3: () => "end",
    yes_q1: () => "yes_q2",
    yes_q2: () => "yes_q3",
    yes_q3: () => "yes_q4",
    yes_q4: () => "yes_q5",
    yes_q5: () => "yes_q6",
    yes_q6: () => "yes_q7",
    yes_q7: () => "end",
  };

  return flow[currentStep] ? flow[currentStep]() : "end";
};

const populateDynamicPlaceholders = async (nextStep, userId) => {
  if (nextStep === "yes_q6") {
    try {
      const activityResponse = await UserResponse.findOne({
        userId,
        questionKey: "yes_q3",
      });

      const activity = activityResponse?.response || "[activity not found]";
      return predefinedQuestions[nextStep].replace(
        "»{activity answered in the 3rd question}«",
        `»${activity}«`
      );
    } catch (error) {
      console.error("[Flow Logic] Error fetching activity:", error.message);
      return predefinedQuestions[nextStep].replace(
        "»{activity answered in the 3rd question}«",
        "[activity not found]"
      );
    }
  }
  return predefinedQuestions[nextStep];
};

module.exports = { getNextStep, predefinedQuestions, populateDynamicPlaceholders };
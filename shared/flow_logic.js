const predefinedQuestions = {
    awaiting_time_response: "Do you have time? Please answer 'yes' or 'no'.",
    yes_q1: "Great! What's your favorite hobby?",
    yes_q2: "Why do you enjoy this hobby?",
    yes_q3: "How often do you engage in this hobby?",
    yes_q4: "Do you usually do this alone or with others?",
    yes_q5: "What inspired you to start this hobby?",
    no_q1: "That's fine. Is there something keeping you busy?",
    no_q2: "Would you like to share what's on your mind?",
    no_q3: "Are you feeling okay today?",
    no_q4: "Do you have plans for later?",
    no_q5: "What would you like to do when you have free time?",
  };
  
  const getNextStep = (currentStep, userMessage) => {
    const flow = {
      awaiting_time_response: () => (userMessage.includes("yes") ? "yes_q1" : "no_q1"),
      yes_q1: () => "yes_q2",
      yes_q2: () => "yes_q3",
      yes_q3: () => "yes_q4",
      yes_q4: () => "yes_q5",
      yes_q5: () => "end",
      no_q1: () => "no_q2",
      no_q2: () => "no_q3",
      no_q3: () => "no_q4",
      no_q4: () => "no_q5",
      no_q5: () => "end",
    };
    return flow[currentStep] ? flow[currentStep]() : "end";
  };
  
  const getExpectedResponse = (currentStep, history) => {
    if (!predefinedQuestions[currentStep]) return null;
    return predefinedQuestions[currentStep];
  };
  
  module.exports = { getNextStep, getExpectedResponse, predefinedQuestions };
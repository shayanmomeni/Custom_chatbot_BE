// Update flow_logic.js and ensure invalid_response transitions correctly

const predefinedQuestions = {
    awaiting_time_response: "Do you have time? Please answer 'yes' or 'no'.",
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
    why_not: "Ah, okay. Why not?",
    yes_q5: "Would you say this is a routine for you? Something you regularly do in daily life?",
    yes_q6: "So, you’re currently doing: »{activity answered in the 3rd question}«. Pick a decision within this activity that involves some degree of choice. What decision would you like to discuss?",
    yes_q7: "What options do you have within this decision? For example, what could you do? And what other options are there? Okay, what else could you do?",
    no_q1: "That's fine. Is there something keeping you busy?",
    invalid_response: "I didn't quite get that. Please answer with 'yes' or 'no'.",
  };

const getNextStep = (currentStep, userMessage) => {
    const flow = {
      awaiting_time_response: () => {
        const normalizedMessage = userMessage.toLowerCase().trim();
        if (normalizedMessage === "yes") return "yes_q1";
        if (normalizedMessage === "no") return "no_q1";
        return "invalid_response";
      },
      invalid_response: () => {
        const normalizedMessage = userMessage.toLowerCase().trim();
        if (normalizedMessage === "yes") return "yes_q1";
        if (normalizedMessage === "no") return "no_q1";
        return "invalid_response"; // Keep asking until valid input is received
      },
      yes_q1: () => "yes_q2",
      yes_q2: () => "yes_q3",
      yes_q3: () => "yes_q4",
      yes_q4: () => "yes_q5",
      yes_q5: () => "yes_q6",
      yes_q6: () => "yes_q7",
      yes_q7: () => "end",
      no_q1: () => "no_q2",
      no_q2: () => "no_q3",
      no_q3: () => "no_q4",
      no_q4: () => "no_q5",
      no_q5: () => "end",
    };

    return flow[currentStep] ? flow[currentStep]() : "end";
};

module.exports = { getNextStep, predefinedQuestions };

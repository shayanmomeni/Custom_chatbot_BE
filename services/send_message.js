const axios = require("axios");

const handleMessage = async (req, res) => {
  const { message, userId, currentStep, history } = req.body;

  console.log("[Service] Received payload:", JSON.stringify({ message, userId, currentStep, history }, null, 2));
  console.log("[Service] Initial step check - Current step:", currentStep);

  if (!message || !userId || !currentStep || !history) {
    console.error("[Service] Missing required parameters");
    return res.status(400).json({
      message: "Bad Request: 'message', 'userId', 'currentStep', and 'history' are required.",
    });
  }

  // Add specific validation for the first yes/no response
  if (currentStep === "awaiting_time_response") {
    const normalizedResponse = message.toLowerCase().trim();
    console.log("[Service] First question response:", normalizedResponse);

    if (!["yes", "no", "ja", "nein"].includes(normalizedResponse)) {
      console.log("[Service] Invalid first response, expecting yes/no");
      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          originalMessage: message,
          openAIResponse: "Please answer with 'yes' or 'no'.",
          nextStep: "awaiting_time_response",
          isEnd: false,
        },
      });
    }

    const isPositiveResponse = ["yes", "ja"].includes(normalizedResponse);
    console.log("[Service] Is positive response:", isPositiveResponse);

    if (isPositiveResponse) {
      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          originalMessage: message,
          openAIResponse: "Great! Let's proceed. Where are you?",
          nextStep: "ask_location",
          isEnd: false,
        },
      });
    } else {
      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          originalMessage: message,
          openAIResponse: "Ah, ok. Why not?",
          nextStep: "why_not",
          isEnd: false,
        },
      });
    }
  }

  const chatMessages = history.map((msg) => ({
    role: msg.isSentByUser ? "user" : "assistant",
    content: msg.text || msg.content,
  }));

  chatMessages.push({ role: "user", content: message });

  console.log("[Service] Processed chat messages:", JSON.stringify(chatMessages, null, 2));

  const predefinedQuestions = {
    awaiting_time_response: "Do you have time? Please answer 'yes' or 'no'.",
    why_not: "I understand. Would you like to share why not?",
    feeling: "Got it. How are you feeling right now? It's okay to share as much or as little as you like.",
    closing: "Thank you for sharing. I'll check back later. Take care! You can close the chat now if you're done.",
    ask_location: "Where are you right now? Feel free to share as much detail as you're comfortable with.",
    ask_company: "Are you alone? If not, who is with you?",
    current_activity: "What are you doing right now?",
    frequency: `How often do you do this per week? Options:
  a. Every day (7+ times)
  b. Almost daily (5-7 times)
  c. Often (3-5 times)
  d. Occasionally (1-2 times)
  e. Rarely (<1 time)
  f. Never, this is an exception
  h. I don't know how to answer that.`,
    why_frequency_h: "That's okay. Could you tell me more about it?",
    frequency_a: {
      response: "I see you do this daily. That sounds like a routine.",
      nextQuestion: "Would you say this is a routine for you? Something you regularly do in your daily life? Yes or No?",
    },
    frequency_other: {
      response: "Ah, so not daily.",
      nextQuestion: "Would you say this is a routine for you? Something you regularly do in your daily life? Yes or No?",
    },
    routine: "Would you say this is a routine for you? Something you regularly do in your daily life? Yes or No?",
    decision: (activity) =>
      `So, you're currently doing: "${activity}". Could you pick a decision within this activity that involves some degree of choice? What decision would you like to discuss?`,
    options: "What options do you have within this decision?",
    example: "What could you do, for example?",
    other_option: "And what other option could there be?",
    final_option: "Okay. What else could you do?",
    end: "We have reached the end of the conversation. Thank you for your time! Please press 'End' at the top right to close the chat.",
  };
  try {
    let activity = "";
    if (currentStep === "decision") {
      const activityMessage = history.find(
        (msg) =>
          msg.role === "user" &&
          history[history.indexOf(msg) - 1]?.content?.includes("What are you doing right now?")
      );
      activity = activityMessage?.content || "[activity not found]";
      console.log("[Service] Retrieved activity for decision step:", activity);
    }

    const systemMessage = `
      You are a conversational assistant guiding users through a predefined flow of questions.
      Strictly follow the predefined questions and do not add any unrelated questions.
      Current step: ${currentStep}
      Current question to ask: ${
        typeof predefinedQuestions[currentStep] === "function"
          ? predefinedQuestions[currentStep](activity)
          : predefinedQuestions[currentStep]?.nextQuestion || predefinedQuestions[currentStep]
      }
      Please respond naturally and stick to the predefined flow only.
    `;

    const openAIResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "system", content: systemMessage }, ...chatMessages],
        temperature: 0.7,
        max_tokens: 1024,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    let assistantMessage = openAIResponse.data.choices[0].message.content.trim();

    // Validate if the response matches the predefined flow
    const expectedResponse =
      typeof predefinedQuestions[currentStep] === "function"
        ? predefinedQuestions[currentStep](activity)
        : predefinedQuestions[currentStep]?.nextQuestion || predefinedQuestions[currentStep];

    if (!assistantMessage.includes(expectedResponse)) {
      console.log("[Service] ChatGPT response deviates from predefined flow. Correcting...");
      assistantMessage = expectedResponse;
    }

    const nextStep = determineNextStep(currentStep, message, activity);
    const isEnd = nextStep === "end";

    console.log(`[Service] Step Transition: ${currentStep} -> ${nextStep} (End: ${isEnd})`);
    console.log(`[Service] Next question to ask: ${predefinedQuestions[nextStep]?.nextQuestion || predefinedQuestions[nextStep]}`);

    res.status(200).json({
      message: "Message processed successfully",
      data: {
        originalMessage: message,
        openAIResponse: assistantMessage,
        nextStep,
        isEnd,
      },
    });
  } catch (error) {
    console.error("[Service] Error processing message:", error);
    res.status(500).json({
      message: "Internal Server Error: Failed to process the message.",
      error: error.message,
    });
  }
};

const determineNextStep = (currentStep, userMessage, activity = "") => {
  const normalizedMessage = userMessage.toLowerCase().trim();

  const flow = {
    awaiting_time_response: () => (normalizedMessage === "yes" ? "ask_location" : "why_not"),
    why_not: () => "feeling",
    feeling: () => "closing",
    closing: () => "end",
    ask_location: () => "ask_company",
    ask_company: () => "current_activity",
    current_activity: () => "frequency",
    frequency: () => {
      if (normalizedMessage === "h") return "why_frequency_h";
      if (normalizedMessage === "a") return "frequency_a";
      return "frequency_other";
    },
    why_frequency_h: () => "routine",
    frequency_a: () => "routine",
    frequency_other: () => "routine",
    routine: () => "decision",
    decision: () => "options",
    options: () => "example",
    example: () => "other_option",
    other_option: () => "final_option",
    final_option: () => "end",
  };

  return flow[currentStep] ? flow[currentStep]() : currentStep;
};

module.exports = handleMessage;
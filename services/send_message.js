const axios = require("axios");

// Store conversation history per user
const conversationHistory = {};

const handleMessage = async (req, res) => {
  const { message, userId, currentStep } = req.body;

  console.log("[Service] Received payload:", { message, userId, currentStep });

  if (!message || !userId || !currentStep) {
    console.error("[Service] Missing required parameters");
    return res.status(400).json({
      message: "Bad Request: 'message', 'userId', and 'currentStep' are required.",
    });
  }

  try {
    // Build the system message with context
    const systemMessage = `
      You are a conversational assistant guiding users through a predefined flow.
      Current step: ${currentStep}.
      Rules:
      1. Based on the current step, guide the user to the next step in the flow.
      2. If the user's response is unrelated or unclear, politely redirect them to the last relevant question.
      3. Keep the context of the conversation and ensure a polite and engaging tone at all times.
      
      Example flow:
      - If the current step is "awaiting_time_response", respond based on 'yes' or 'no'.
      - If the step is "ask_location", ask: "Where are you located?"
      - If the step is "ask_company", ask: "Are you alone? If not, who is with you?"
    `;

    // Initialize conversation history for the user if not present
    if (!conversationHistory[userId]) {
      conversationHistory[userId] = [
        { role: "system", content: systemMessage },
      ];
    }

    // Append user's message to history
    conversationHistory[userId].push({ role: "user", content: message });

    // Call ChatGPT API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: conversationHistory[userId],
        temperature: 0.7,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const assistantMessage =
      response.data.choices[0]?.message?.content.trim() || "No response.";
    console.log("[Service] Response from ChatGPT:", assistantMessage);

    // Append ChatGPT's response to history
    conversationHistory[userId].push({ role: "assistant", content: assistantMessage });

    // Determine the next step based on the current step and message
    const nextStep = determineNextStep(currentStep, message);

    // Respond to the frontend
    res.status(200).json({
      message: "Message processed successfully",
      data: {
        originalMessage: message,
        openAIResponse: assistantMessage,
        nextStep,
      },
    });
  } catch (error) {
    console.error("[Service] Error calling ChatGPT API:", error.message);
    res.status(500).json({
      message: "Internal Server Error: Failed to process the message.",
    });
  }
};

// Determine the next step based on current step and user input
const determineNextStep = (currentStep, userMessage) => {
  const lowerMessage = userMessage.toLowerCase();

  switch (currentStep) {
    case "awaiting_time_response":
      return lowerMessage === "yes" ? "ask_location" : "ask_company";
    case "ask_location":
      return lowerMessage ? "ask_company" : currentStep;
    case "ask_company":
      return "current_activity";
    default:
      return currentStep; // Default to current step if no match
  }
};

module.exports = handleMessage;
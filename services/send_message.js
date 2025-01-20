const { getChatGPTResponse } = require("../utils/chatgpt");
const { getNextStep, getExpectedResponse, predefinedQuestions } = require("../shared/flow_logic");

const handleMessage = async (req, res) => {
  const { message, userId, currentStep, history } = req.body;

  console.log("[Backend] Received message:", message);
  console.log("[Backend] Current step:", currentStep);

  if (!message || !userId || !currentStep || !history) {
    return res.status(400).json({ message: "Bad Request: Missing required parameters." });
  }

  const normalizedMessage = message.toLowerCase().trim();
  const expectedResponse = getExpectedResponse(currentStep, history);

  if (currentStep === "awaiting_time_response" && !["yes", "no"].includes(normalizedMessage)) {
    console.log("[Backend] Invalid response for current step.");
    return res.status(200).json({
      message: "Message processed successfully",
      data: {
        openAIResponse: "Please answer 'yes' or 'no'.",
        nextStep: currentStep,
        isEnd: false,
      },
    });
  }

  const nextStep = getNextStep(currentStep, normalizedMessage);

  try {
    const chatMessages = history.map((msg) => ({
      role: msg.isSentByUser ? "user" : "assistant",
      content: msg.content,
    }));
    chatMessages.push({ role: "user", content: message });

    const openAIResponse = await getChatGPTResponse(chatMessages, currentStep);

    console.log("[Backend] Assistant message:", openAIResponse);

    res.status(200).json({
      message: "Message processed successfully",
      data: {
        openAIResponse: openAIResponse || predefinedQuestions[nextStep],
        nextStep,
        isEnd: nextStep === "end",
      },
    });
  } catch (error) {
    console.error("[Backend] Error during processing:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = handleMessage;
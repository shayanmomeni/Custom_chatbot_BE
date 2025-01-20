const UserResponse = require("../models/UserResponse");
const { getNextStep, predefinedQuestions } = require("../shared/flow_logic");
const { getChatGPTResponse } = require("../utils/chatgpt");

const handleMessage = async (req, res) => {
  const { message, userId, currentStep, history } = req.body;

  console.log("[Backend] Received message:", message);
  console.log("[Backend] Current step:", currentStep);

  if (!message || !userId || !currentStep || !history) {
    return res.status(400).json({ message: "Bad Request: Missing required parameters." });
  }

  try {
    // Save user response to the database
    await UserResponse.create({ userId, questionKey: currentStep, response: message });
    console.log(`[Backend] Saved response for step ${currentStep}: ${message}`);

    // Prepare validation request for ChatGPT
    const currentQuestion = predefinedQuestions[currentStep];
    const messagesForChatGPT = [
      {
        role: "system",
        content: `
          You are a validation system. Only validate if the user's response is relevant to the question: 
          "${currentQuestion}". Respond with "valid" if the answer is correct, otherwise respond with "invalid".
        `,
      },
      {
        role: "assistant",
        content: currentQuestion,
      },
      {
        role: "user",
        content: message,
      },
    ];

    // Validate response using ChatGPT
    const chatGPTResponse = await getChatGPTResponse(messagesForChatGPT);
    console.log("[ChatGPT] Validation response:", chatGPTResponse);

    const isResponseValid = chatGPTResponse.trim().toLowerCase() === "valid";

    if (isResponseValid) {
      // Determine the next step
      const nextStep = getNextStep(currentStep, message);
      let responseMessage = predefinedQuestions[nextStep] || "End of flow.";

      // Handle activity placeholder for `yes_q6`
      if (nextStep === "yes_q6") {
        const activityResponse = await UserResponse.findOne({
          userId,
          questionKey: "yes_q3",
        });

        const activity = activityResponse?.response || "[activity not found]";
        responseMessage = responseMessage.replace(
          "»{activity answered in the 3rd question}«",
          `»${activity}«`
        );
        console.log(`[Backend] Replaced activity placeholder with: ${activity}`);
      }

      console.log(`[Backend] Next step determined: ${nextStep}`);
      console.log(`[Backend] Response message for next step (${nextStep}): ${responseMessage}`);

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: responseMessage,
          nextStep,
          isEnd: nextStep === "end",
        },
      });
    } else {
      // Invalid response; re-ask the same question
      const responseMessage = `Your answer is not valid. Please try again: "${currentQuestion}"`;
      console.log("[Backend] Invalid response. Asking user to try again.");

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: responseMessage,
          nextStep: currentStep, // Stay on the current step
          isEnd: false,
        },
      });
    }
  } catch (error) {
    console.error("[Backend] Error during processing:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = handleMessage;
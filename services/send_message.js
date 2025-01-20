const UserResponse = require("../models/UserResponse");
const { getNextStep, predefinedQuestions } = require("../shared/flow_logic");
const { getChatGPTValidation } = require("../utils/chatgpt");

const handleMessage = async (req, res) => {
  const { message, userId, currentStep, conversationId } = req.body; // Added `conversationId`

  try {
    const currentQuestion = predefinedQuestions[currentStep];
    if (!currentQuestion) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    console.log(`[Backend] Received message: "${message}" for step: "${currentStep}"`);

    // Validate response with ChatGPT
    const { validationMessage, isValid } = await getChatGPTValidation(currentQuestion, message);

    console.log(`[ChatGPT] Validation message: "${validationMessage}"`);
    console.log(`[Backend] Is response valid: ${isValid}`);

    if (isValid) {
      const generatedConversationId = conversationId || Date.now().toString(); // Generate conversationId if not provided

      // Save the valid response
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId }, // Include `conversationId`
        { response: message },
        { upsert: true, new: true }
      );
      console.log(
        `[Backend] Saved valid response for step: "${currentStep}", response: "${message}", conversationId: "${generatedConversationId}"`
      );

      // Get the next step and prepare the response
      const nextStep = getNextStep(currentStep, message);
      let nextQuestion = predefinedQuestions[nextStep] || "End of flow.";

      // Handle dynamic placeholder replacement
      if (nextStep === "yes_q6") {
        const activityResponse = await UserResponse.findOne({
          userId,
          questionKey: "yes_q3", // Fetching the response from step `yes_q3`
          conversationId: generatedConversationId, // Match by `conversationId`
        });

        const activity = activityResponse?.response || "[activity not found]";
        nextQuestion = nextQuestion.replace("»{activity answered in the 3rd question}«", `»${activity}«`);
        console.log(`[Backend] Replaced activity placeholder with: "${activity}"`);
      }

      console.log(`[Backend] Proceeding to next step: "${nextStep}"`);
      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: nextQuestion,
          nextStep,
          isEnd: nextStep === "end",
          conversationId: generatedConversationId, // Return the conversationId
        },
      });
    } else {
      // Invalid response: Combine ChatGPT feedback with re-asking the question
      const politeResponse = `${validationMessage}\n\nTo continue: ${currentQuestion}`;
      console.log(`[Backend] Invalid response. Re-asking the question: "${currentStep}"`);

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: politeResponse,
          nextStep: currentStep,
          isEnd: false,
          conversationId, // Return the existing conversationId (if provided)
        },
      });
    }
  } catch (error) {
    console.error("[Backend] Error during message handling:", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = handleMessage;
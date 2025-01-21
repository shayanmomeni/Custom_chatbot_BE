
const UserResponse = require("../models/UserResponse");
const { getNextStep, predefinedQuestions } = require("../shared/flow_logic");
const { getChatGPTValidation } = require("../utils/chatgpt");
const { getUserImages } = require("../utils/file_utils");

const handleMessage = async (req, res) => {
  const { message, userId, currentStep, conversationId } = req.body;

  console.log(`[Backend] Received message: "${message}" for step: "${currentStep}"`);
  console.log(`[Backend] Received userId: "${userId}"`);
  console.log(`[Backend] Received conversationId: "${conversationId || "not provided"}"`);

  try {
    const currentQuestion = predefinedQuestions[currentStep];
    if (!currentQuestion) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    const generatedConversationId = conversationId || Date.now().toString();

    // Handle the image step
    if (currentStep === "yes_q6") {
      console.log(`[Backend] Fetching images for userId: "${userId}"`);
      const images = getUserImages(userId);

      if (images.length > 0) {
        console.log(`[Backend] Found ${images.length} images for userId: "${userId}"`);
        console.log(`[Backend] Image URLs:`, images);

        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponse: currentQuestion,
            nextStep: "end",
            isEnd: true,
            images,
            conversationId: generatedConversationId,
          },
        });
      } else {
        console.warn(`[Backend] No images found for userId: "${userId}"`);
        return res.status(200).json({
          message: "No images found for the user.",
          data: {
            nextStep: currentStep,
            isEnd: false,
            conversationId: generatedConversationId,
          },
        });
      }
    }

    // Validation with ChatGPT
    const { validationMessage, isValid } = await getChatGPTValidation(currentQuestion, message);

    console.log(`[ChatGPT] Validation message: "${validationMessage}"`);
    console.log(`[Backend] Is response valid: ${isValid}`);

    if (isValid) {
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId },
        { response: message },
        { upsert: true, new: true }
      );

      console.log(`[Backend] Saved valid response for step: "${currentStep}"`);

      const nextStep = getNextStep(currentStep, message);
      const nextQuestion = predefinedQuestions[nextStep] || "End of flow.";

      console.log(`[Backend] Proceeding to next step: "${nextStep}"`);
      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: nextQuestion,
          nextStep,
          isEnd: nextStep === "end",
          conversationId: generatedConversationId,
        },
      });
    } else {
      console.log(`[Backend] Invalid response for step: "${currentStep}"`);

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: `${validationMessage}\n\nTo continue: ${currentQuestion}`,
          nextStep: currentStep,
          isEnd: false,
          conversationId,
        },
      });
    }
  } catch (error) {
    console.error("[Backend] Error during message handling:", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = handleMessage;

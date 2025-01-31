const { v4: uuidv4 } = require("uuid"); // Import UUID for unique conversation IDs
const UserResponse = require("../models/UserResponse");
const { getNextStep, predefinedQuestions, populateDynamicPlaceholders } = require("../shared/flow_logic");
const { getChatGPTValidation } = require("../utils/chatgpt");
const { getUserImages } = require("../utils/file_utils");

const handleMessage = async (req, res) => {
  const { message, userId, currentStep, conversationId } = req.body;
  
  // Generate a new conversation ID if one doesn't exist (indicates new session)
  const generatedConversationId = conversationId || uuidv4();

  console.log(`[Backend] Using conversationId: ${generatedConversationId} for userId: ${userId}`);

  try {
    const currentQuestion = predefinedQuestions[currentStep];

    if (!currentQuestion) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    // **Step 7: Send images to the user before continuing**
    if (currentStep === "yes_q7") {
      console.log(`[Backend] Fetching images for userId: "${userId}"`);
      const images = getUserImages(userId);

      if (images.length > 0) {
        console.log(`[Backend] Found ${images.length} images for userId: "${userId}"`);

        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponse: currentQuestion,
            nextStep: "yes_q8", // Move to the next step after image selection
            isEnd: false,
            images,
            conversationId: generatedConversationId,
          },
        });
      } else {
        console.warn(`[Backend] No images found for userId: "${userId}"`);
        return res.status(200).json({
          message: "No images found for the user.",
          data: {
            nextStep: currentStep, // Stay on the same step
            isEnd: false,
            conversationId: generatedConversationId,
          },
        });
      }
    }

    // **Validate the response with ChatGPT**
    const { validationMessage, isValid } = await getChatGPTValidation(currentQuestion, message, currentStep);

    console.log(`[ChatGPT] Validation message: "${validationMessage}"`);
    console.log(`[Backend] Is response valid: ${isValid}`);

    if (isValid) {
      // **Store valid response in the database with conversation ID**
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId },
        { response: message },
        { upsert: true, new: true }
      );

      console.log(`[Backend] Saved valid response for step: "${currentStep}" under conversationId: "${generatedConversationId}"`);

      // **Get the next step & dynamically update the question if needed**
      const nextStep = getNextStep(currentStep, message);
      const nextQuestion = await populateDynamicPlaceholders(nextStep, userId, generatedConversationId);

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

      // **🔹 Fix: Ensure the stored activity is retrieved when repeating the question**
      let updatedQuestion = currentQuestion;
      if (currentStep === "yes_q3") {
        updatedQuestion = await populateDynamicPlaceholders(currentStep, userId, generatedConversationId);
      }

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: `${validationMessage}\n\nTo continue: ${updatedQuestion}`,
          nextStep: currentStep, // Stay on the same step until valid input is provided
          isEnd: false,
          conversationId: generatedConversationId,
        },
      });
    }
  } catch (error) {
    console.error("[Backend] Error during message handling:", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = handleMessage;
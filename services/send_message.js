// controllers/send_message.js
const UserResponse = require("../models/UserResponse");
const {
  getNextStep,
  predefinedQuestions,
  populateDynamicPlaceholders,
} = require("../shared/flow_logic");
const { getChatGPTValidation } = require("../utils/chatgpt");
const { getUserImages } = require("../utils/file_utils");

const handleMessage = async (req, res) => {
  let { message, userId, currentStep, conversationId } = req.body;
  console.log(`[Backend] Received message: "${message}" for step: "${currentStep}"`);

  // Map legacy step "awaiting_time_response" to the new initial step "B2"
  if (currentStep === "awaiting_time_response") {
    currentStep = "B2";
  }

  try {
    // 1. Validate we have a question for this step
    const currentQuestion = predefinedQuestions[currentStep];
    if (!currentQuestion) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    // Use an existing conversationId or generate a new one
    const generatedConversationId = conversationId || Date.now().toString();

    // 2. If this step is the "send images" step (yes_q7)
    if (currentStep === "yes_q7") {
      console.log(`[Backend] Fetching images for userId: "${userId}"`);
      const images = getUserImages(userId);

      if (images.length > 0) {
        console.log(`[Backend] Found ${images.length} images for userId: "${userId}"`);
        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponse: currentQuestion, // No placeholder needed
            nextStep: "yes_q8",               // Move to next step
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
            nextStep: currentStep, // Stay on same step if no images
            isEnd: false,
            conversationId: generatedConversationId,
          },
        });
      }
    }

    // 3. Validate user response with ChatGPT
    let { validationMessage, isValid } = await getChatGPTValidation(currentQuestion, message, currentStep);
    console.log(`[ChatGPT] Validation message: "${validationMessage}"`);
    console.log(`[Backend] Is response valid: ${isValid}`);

    // 3.1. Sanitize ChatGPT's validation message in case it echoed {activity}
    if (validationMessage.includes("{activity}")) {
      try {
        // Fetch the user's activity from yes_q2, same logic as in populateDynamicPlaceholders
        const activityDoc = await UserResponse.findOne({
          userId,
          conversationId: generatedConversationId,
          questionKey: "yes_q2",
        });
        const activity = activityDoc?.response || "[activity not found]";

        // Replace all occurrences of {activity} in ChatGPT's text
        validationMessage = validationMessage.replace(/{activity}/g, activity);
        console.log(
          `[Backend] Replaced "{activity}" with "${activity}" in ChatGPT's validation message.`
        );
      } catch (err) {
        console.error(
          "[Backend] Error replacing {activity} in validation message:",
          err.message
        );
      }
    }

    // 4. If Valid
    if (isValid) {
      // 4a. Store valid response
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId },
        { response: message },
        { upsert: true, new: true }
      );
      console.log(
        `[Backend] Saved valid response for step: "${currentStep}" under conversationId: "${generatedConversationId}"`
      );

      // 4b. Calculate next step & build next question with placeholders
      const nextStep = getNextStep(currentStep, message);

      let nextQuestion = "End of flow.";
      if (predefinedQuestions[nextStep]) {
        nextQuestion = await populateDynamicPlaceholders(nextStep, userId, generatedConversationId);
      }

      // 4c. Tidy up the AI validation message (remove trailing AI question if any)
      validationMessage = validationMessage.replace(/\?[^.]*$/, "").trim();

      // 4d. Combine the AI's friendly message with our next question
      const fullResponse = `${validationMessage} ${nextQuestion}`.trim();
      console.log(`[Backend] Proceeding to next step: "${nextStep}"`);

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: fullResponse,
          nextStep,
          isEnd: nextStep === "end",
          conversationId: generatedConversationId,
        },
      });
    }

    // 5. If Invalid
    console.log(`[Backend] Invalid response for step: "${currentStep}"`);

    // 5a. If user is stuck/confused at yes_q3, re-inject placeholders
    if (currentStep === "yes_q3") {
      // Rebuild the same question for yes_q3 with placeholders
      const repeatedQuestion = await populateDynamicPlaceholders(
        currentStep,
        userId,
        generatedConversationId
      );

      // Tidy AI's validation and append the repeated question
      const formattedValidationMessage = `${validationMessage} Here is the question again: ${repeatedQuestion}`.trim();
      console.log(`[Flow Logic] Repeating yes_q3 with placeholders for user clarification.`);

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: formattedValidationMessage,
          nextStep: currentStep,
          isEnd: false,
          conversationId: generatedConversationId,
        },
      });
    }

    // 5b. For other steps, just send the validation message again
    return res.status(200).json({
      message: "Message processed successfully",
      data: {
        openAIResponse: validationMessage,
        nextStep: currentStep, // stay on same step
        isEnd: false,
        conversationId: generatedConversationId,
      },
    });
  } catch (error) {
    console.error("[Backend] Error during message handling:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = handleMessage;

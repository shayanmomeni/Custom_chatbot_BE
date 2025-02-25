// controllers/send_message.js

const UserResponse = require("../models/UserResponse");
const {
  getNextStep,
  predefinedQuestions,
  populateDynamicPlaceholders,
  FINAL_REFLECTION
} = require("../shared/flow_logic");
const { getChatGPTValidation } = require("../utils/chatgpt");
const { getUserAspectsAndImages } = require("../utils/file_utils");

async function handleMessage(req, res) {
  let { message, userId, currentStep, conversationId } = req.body;
  console.log(`[Backend] Received message: "${message}" for step: "${currentStep}"`);

  // 1. Convert "awaiting_time_response" -> "B2"
  if (currentStep === "awaiting_time_response") {
    currentStep = "B2";
  }

  try {
    // 2. Ensure step is defined
    const hasStep = Object.prototype.hasOwnProperty.call(predefinedQuestions, currentStep);
    if (!hasStep) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    // 3. Fallback for B2 so GPT sees a question
    let currentQuestion = predefinedQuestions[currentStep] ?? "";
    if (currentStep === "B2" && !currentQuestion.trim()) {
      currentQuestion = "Would you like to reflect on a decision now? Please answer yes or no.";
    }
    console.log(`[Backend] currentQuestion for step ${currentStep}: "${currentQuestion}"`);

    // 4. Reuse or generate conversationId
    const generatedConversationId = conversationId || Date.now().toString();

    // 5. GPT Validation
    console.log(`[Backend] Using GPT for step "${currentStep}" validation.`);
    const { validationMessage, isValid } = await getChatGPTValidation(
      currentQuestion,
      message,
      currentStep
    );
    console.log(`[ChatGPT] validationMessage: "${validationMessage}" | isValid: ${isValid}`);

    // 6. If valid
    if (isValid) {
      // 6a. Store user response
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId },
        { response: message },
        { upsert: true, new: true }
      );
      console.log(
        `[Backend] Stored valid response for step "${currentStep}" under conversation "${generatedConversationId}"`
      );

      // 6b. Next step
      const nextStep = getNextStep(currentStep, message);
      console.log(`[Flow Logic] nextStep from ${currentStep}: "${nextStep}"`);

      // End?
      if (nextStep === "end") {
        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponse: "",
            nextStep,
            isEnd: true,
            conversationId: generatedConversationId
          }
        });
      }

      // === NEW: If next step is D => show images one step earlier ===
      if (nextStep === "D") {
        console.log(`[Backend] Next step is "D", returning aspect images earlier...`);
        const aspectImagePairs = getUserAspectsAndImages(userId);

        let nextQuestion = predefinedQuestions["D"] 
          || "Does this decision bring up any inner disagreement between your self-aspects? (Yes/No)";

        nextQuestion = await populateDynamicPlaceholders("D", userId, generatedConversationId);

        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponse: nextQuestion.trim(),
            aspects: aspectImagePairs,
            nextStep: "D",
            isEnd: false,
            conversationId: generatedConversationId
          }
        });
      }

      // If next step is E => we no longer show images here, because we did it at D.
      // If you want to keep them, you can—but presumably we removed it.

      // If next step is an overview step => show final reflection
      if (["I1", "I", "I3", "I4"].includes(nextStep)) {
        const overviewText = await populateDynamicPlaceholders(nextStep, userId, generatedConversationId);
        const finalReflection = FINAL_REFLECTION || "Any reflections on how you feel now?";

        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponses: [overviewText, finalReflection],
            nextStep: "X",
            isEnd: false,
            conversationId: generatedConversationId
          }
        });
      }

      // Otherwise => standard next question
      let nextQuestion = "End of flow.";
      if (predefinedQuestions[nextStep]) {
        nextQuestion = await populateDynamicPlaceholders(nextStep, userId, generatedConversationId);
      }

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: `${validationMessage} ${nextQuestion}`.trim(),
          nextStep,
          isEnd: nextStep === "end",
          conversationId: generatedConversationId
        }
      });
    }

    // 7. If invalid or confused => remain on same step
    console.log(`[Backend] Invalid/Confused => remain on step: "${currentStep}"`);
    return res.status(200).json({
      message: "Message processed successfully",
      data: {
        openAIResponse: validationMessage,
        nextStep: currentStep,
        isEnd: false,
        conversationId: generatedConversationId
      }
    });
  } catch (error) {
    console.error("[Backend] Error during message handling:", error.message);
    return res.status(500).json({ message: "Internal Server Error." });
  }
}

module.exports = handleMessage;
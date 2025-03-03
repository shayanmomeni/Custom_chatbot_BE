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

  // If the client starts with "awaiting_time_response", we map it to B2
  if (currentStep === "awaiting_time_response") {
    currentStep = "B2";
  }

  try {
    // Ensure currentStep is valid
    const hasStep = Object.prototype.hasOwnProperty.call(predefinedQuestions, currentStep);
    if (!hasStep) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    // If B2 is blank, fallback
    let currentQuestion = predefinedQuestions[currentStep] || "";
    if (currentStep === "B2" && !currentQuestion.trim()) {
      currentQuestion = "Would you like to reflect on a decision now? Please answer yes or no.";
    }
    console.log(`[Backend] currentQuestion for step ${currentStep}: "${currentQuestion}"`);

    // conversationId
    const generatedConversationId = conversationId || Date.now().toString();

    // Track attempt count
    let existingResponse = await UserResponse.findOne({
      userId,
      questionKey: currentStep,
      conversationId: generatedConversationId
    });
    let attemptCount = 1;
    if (existingResponse) {
      attemptCount = (existingResponse.attemptCount || 1) + 1;
    }
    console.log(`[Backend] Attempt Count for step ${currentStep}: ${attemptCount}`);

    // dynamic aspect usage
    const aspectImagePairs = getUserAspectsAndImages(userId);
    const userAspectNames = aspectImagePairs.map((obj) => obj.aspectName);

    // GPT validation
    console.log(`[Backend] Using GPT for step "${currentStep}" validation.`);
    const { validationMessage, isValid } = await getChatGPTValidation({
      currentQuestion,
      userResponse: message,
      currentStep,
      attemptCount,
      userAspects: userAspectNames
    });
    console.log(`[ChatGPT] validationMessage: "${validationMessage}" | isValid: ${isValid}`);

    if (isValid) {
      // Store user response
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId },
        { response: message, attemptCount },
        { upsert: true, new: true }
      );
      console.log(`[Backend] Stored valid response for step "${currentStep}" under conversation "${generatedConversationId}"`);

      // next step
      const nextStep = getNextStep(currentStep, message);
      console.log(`[Flow Logic] nextStep from ${currentStep}: "${nextStep}"`);

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

      // If next step is D => return aspect images
      if (nextStep === "D") {
        console.log(`[Backend] Next step is "D", returning aspect images...`);
        let nextQuestionD = predefinedQuestions["D"] || "Does this decision bring up any disagreement?";
        nextQuestionD = await populateDynamicPlaceholders("D", userId, generatedConversationId);
        return res.status(200).json({
          message: "Message processed successfully",
          data: {
            openAIResponse: nextQuestionD.trim(),
            aspects: aspectImagePairs,
            nextStep: "D",
            isEnd: false,
            conversationId: generatedConversationId
          }
        });
      }

      // Overviews (I1, I, I3, I4) => show reflection
      if (["I1", "I", "I3", "I4"].includes(nextStep)) {
        const overviewText = await populateDynamicPlaceholders(nextStep, userId, generatedConversationId);
        const finalReflection = FINAL_REFLECTION ||
          "Final Reflection: Do you feel more confident in making choices that align with your values after our conversation? If yes, why?";
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

      // otherwise next question
      let nextQuestionText = "End of flow.";
      if (predefinedQuestions[nextStep]) {
        nextQuestionText = await populateDynamicPlaceholders(nextStep, userId, generatedConversationId);
      }

      return res.status(200).json({
        message: "Message processed successfully",
        data: {
          openAIResponse: `${validationMessage} ${nextQuestionText}`.trim(),
          nextStep,
          isEnd: nextStep === "end",
          conversationId: generatedConversationId
        }
      });
    }

    // invalid => remain on step
    console.log(`[Backend] Invalid => remain on step: "${currentStep}"`);
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
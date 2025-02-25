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
const { aggregateConversation } = require("../services/aggregate_conversation");

async function handleMessage(req, res) {
  let { message, userId, currentStep, conversationId } = req.body;
  console.log(`[Backend] Received message: "${message}" for step: "${currentStep}"`);

  // Convert "awaiting_time_response" -> "B2" if needed.
  if (currentStep === "awaiting_time_response") {
    currentStep = "B2";
  }

  try {
    const hasStep = Object.prototype.hasOwnProperty.call(predefinedQuestions, currentStep);
    if (!hasStep) {
      console.error("[Backend] Invalid current step:", currentStep);
      return res.status(400).json({ message: "Invalid current step." });
    }

    let currentQuestion = predefinedQuestions[currentStep] ?? "";
    if (currentStep === "B2" && !currentQuestion.trim()) {
      currentQuestion = "Would you like to reflect on a decision now? Please answer yes or no.";
    }
    console.log(`[Backend] currentQuestion for step ${currentStep}: "${currentQuestion}"`);

    // Generate or reuse conversationId.
    const generatedConversationId = conversationId || Date.now().toString();

    // GPT Validation
    console.log(`[Backend] Using GPT for step "${currentStep}" validation.`);
    const { validationMessage, isValid } = await getChatGPTValidation(
      currentQuestion,
      message,
      currentStep
    );
    console.log(`[ChatGPT] validationMessage: "${validationMessage}" | isValid: ${isValid}`);

    if (isValid) {
      // Store the user response.
      await UserResponse.findOneAndUpdate(
        { userId, questionKey: currentStep, conversationId: generatedConversationId },
        { response: message },
        { upsert: true, new: true }
      );
      console.log(
        `[Backend] Stored valid response for step "${currentStep}" under conversation "${generatedConversationId}"`
      );

      // Determine the next step.
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

      // For step D, return images along with the question.
      if (nextStep === "D") {
        console.log(`[Backend] Next step is "D", returning aspect images earlier...`);
        const aspectImagePairs = getUserAspectsAndImages(userId);

        let nextQuestion = predefinedQuestions["D"] || "Does this decision bring up any inner disagreement between your self-aspects? (Yes/No)";
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

      // For Overview steps, update aggregation and then generate the overview.
      if (["I1", "I", "I3", "I4"].includes(nextStep)) {
        await aggregateConversation(generatedConversationId, userId);
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

      // For all other steps, generate the next question.
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

    // If validation fails, remain on the current step.
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

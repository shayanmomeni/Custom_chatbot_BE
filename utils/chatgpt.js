const axios = require("axios");

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape special characters for RegEx
};

const getChatGPTValidation = async (currentQuestion, userResponse, currentStep) => {
  try {
    let validationPrompt = `
      You are a friendly AI validator for a chatbot. Your job is to:
      
      
      1. If the response is incorrect but reasonable (e.g., talking about Shiraz when asked a different question), acknowledge it briefly and bring them back to the conversation.
      2. If the response is completely off-topic or invalid, politely ask the user to try again.
      3. If the user seems **confused** or asks **"What were we discussing?"**, **"What is the question?"**, or **"I don’t understand"**, **explain the question briefly and repeat it exactly as it was originally written**.

      **IMPORTANT RULES:**
      - AI must **NEVER** ask a question. **AI responses must NOT contain questions.**
      - AI **must provide explanations if the user is confused.**
      - AI **must repeat the last question exactly** after explaining.
      - AI **must NOT judge users response either positively or .
      - AI **must NOT rephrase or modify the chatbot’s predefined questions.**


      **Response Format:**
      - If correct: "Valid: [a very brief friendly reaction without a question or judgment]"
        - Example: "Thank you for the answer"
      - If off-topic but reasonable: "Friendly: [Acknowledge response but NO question]"
        - Example: "Shiraz is a beautiful city!  But let's stay on track."
      - If invalid: "Invalid: [Polite explanation but NO question]"
        - Example: "Hmm, that doesn't quite answer.  Let's try again."
      - If user is confused or asks for clarification: "Confused: [Brief explanation of the question] [Repeat the exact predefined question]"

      **EXAMPLES OF CONFUSION RESPONSES:**
      - **User:** "What were we talking about?"  
        **AI:** "It seems like you're a little lost. We were discussing choices within your current activity. Let’s go back to it: **What are you doing?**"
      - **User:** "What is the question?"  
        **AI:** "No worries! Let me clarify. This question is about selecting a specific option within your activity. Here it is again: **Pick a choice within this activity that has a wider range of options.**"
      - **User:** "I don’t understand"  
        **AI:** "I’m happy to clarify! This question asks you to describe the different possibilities within your activity. Here it is again: **What options do you have within this choice?**"
    `;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: validationPrompt },
          { role: "assistant", content: `Question: "${currentQuestion}"` },
          { role: "user", content: userResponse },
        ],
        temperature: 1.1, // Keep creativity but ensure consistency
        max_tokens: 250,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    if (response.data && response.data.choices.length > 0) {
      let feedback = response.data.choices[0]?.message?.content?.trim();

      if (!feedback) {
        console.error("[ChatGPT] Error: Unexpected API response structure.");
        return { validationMessage: "Oops! Something went wrong. Please try again. 🤖", isValid: false };
      }

      // **🔹 Fix: Remove any AI-generated questions**
      feedback = feedback.replace(/\?[^.]*$/, "").trim(); // Remove AI-added questions

      // **Remove classification labels (Friendly, Invalid, Valid, Confused)**
      feedback = feedback.replace(/^Invalid:\s*/i, "").replace(/^Valid:\s*/i, "").replace(/^Friendly:\s*/i, "").replace(/^Confused:\s*/i, "");

      // **Escape special characters from `currentQuestion` before using in RegEx**
      const escapedCurrentQuestion = escapeRegExp(currentQuestion);
      feedback = feedback.replace(new RegExp(`\\b${escapedCurrentQuestion}\\b`, "gi"), "").trim();

      const isValid = response.data.choices[0]?.message?.content?.toLowerCase()?.startsWith("valid:");
      const isFriendly = response.data.choices[0]?.message?.content?.toLowerCase()?.startsWith("friendly:");
      const isConfused = response.data.choices[0]?.message?.content?.toLowerCase()?.startsWith("confused:");

      if (isConfused) {
        return {
          validationMessage: feedback,
          isValid: false, // Keep user on the same step, but clarify the question
        };
      }

      if (isFriendly) {
        return {
          validationMessage: feedback, 
          isValid: false, // Keep user on the same step, but with a friendly response
        };
      }

      return { validationMessage: feedback, isValid };
    } else {
      console.error("[ChatGPT] Error: Empty response from API.");
      return { validationMessage: "Hmm, I'm having trouble understanding that. 😊 Could you try again?", isValid: false };
    }
  } catch (error) {
    console.error("[ChatGPT] Error during API call:", error.message);
    return { validationMessage: "Oops! Something went wrong. Please try again. 🤖", isValid: false };
  }
};

module.exports = { getChatGPTValidation };
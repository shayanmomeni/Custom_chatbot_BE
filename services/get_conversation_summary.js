// controllers/get_conversation_summary.js
const Conversation = require("../models/Conversation");

const getConversationSummary = async (req, res) => {
  const { conversationId, userId } = req.query;
  try {
    const conversation = await Conversation.findOne({ conversationId, userId });
    if (!conversation) {
      return res.status(404).json({ message: "Aggregated conversation not found" });
    }
    res.json(conversation);
  } catch (error) {
    console.error("[getConversationSummary] Error:", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = getConversationSummary;

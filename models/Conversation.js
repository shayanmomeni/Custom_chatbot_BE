// models/Conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  decision: {
    type: String,
    default: "",
  },
  options: {
    type: [String],
    default: [],
  },
  // selfAspects is stored as an array of objects { aspectName, preference }
  selfAspects: {
    type: [
      {
        aspectName: { type: String },
        preference: { type: String }
      }
    ],
    default: [],
  },
  feelings: {
    type: String,
    default: "",
  },
  finalIdea: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Conversation', ConversationSchema);

const mongoose = require("mongoose");

const userResponseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questionKey: { type: String, required: true },
  response: { type: String, required: true },
  conversationId: { type: String, required: true }, // New field
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserResponse", userResponseSchema);
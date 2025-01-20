const mongoose = require("mongoose");

const UserResponseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questionKey: { type: String, required: true }, // e.g., "yes_q4"
  response: { type: String, required: true }, // e.g., "h", "a", etc.
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserResponse", UserResponseSchema);
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  processedMessage: {
    type: String,
    default: null, // Default to null if not processed yet
  },
  createdAt: {
    type: Date,
    default: Date.now, 
  },
});

module.exports = mongoose.model('Message', MessageSchema);






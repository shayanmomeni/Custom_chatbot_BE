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






// const connectToMongoDB = require('../database'); // Database connection
// const Message = require('../models/Message'); // Mongoose model
// const axios = require('axios'); // For making HTTP requests

// const sendMessageService = async (req, res) => {
//   const { message, userId } = req.body;

//   if (!message || !userId) {
//     return res.status(400).json({
//       message: 'Message and userId are required',
//       error_code: 'missing_fields',
//     });
//   }

//   try {
//     // Store the original message in the database
//     const newMessage = new Message({
//       userId,
//       message,
//     });
//     const savedMessage = await newMessage.save();

//     // Apply a placeholder script (e.g., modify the message)
//     const processedMessage = `Processed version of: "${message}"`;

//     // Send the processed message to OpenAI (simulate for now)
//     const openAIResponse = await axios.post(
//       'https://api.openai.com/v1/completions',
//       {
//         model: 'text-davinci-003', // Example model
//         prompt: processedMessage,
//         max_tokens: 100,
//       },
//       {
//         headers: {
//           Authorization: `Bearer YOUR_OPENAI_API_KEY`, // Replace with your key
//         },
//       }
//     );

//     // Extract OpenAI's response
//     const openAIResult = openAIResponse.data.choices[0].text;

//     // Update the database with the processed message and OpenAI result
//     savedMessage.processedMessage = processedMessage;
//     await savedMessage.save();

//     // Send the response to the user
//     return res.status(200).json({
//       message: 'Message processed successfully',
//       data: {
//         id: savedMessage._id,
//         originalMessage: savedMessage.message,
//         processedMessage: savedMessage.processedMessage,
//         openAIResponse: openAIResult,
//       },
//     });
//   } catch (error) {
//     console.error('Error processing message:', error);
//     return res.status(500).json({
//       message: 'Internal server error',
//       error_code: 'internal_error',
//     });
//   }
// };

// module.exports = sendMessageService;


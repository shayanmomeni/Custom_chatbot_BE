const Message = require('../models/Message');
const axios = require('axios');

const sendMessageService = async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    return res.status(400).json({
      message: 'Message and userId are required',
      error_code: 'missing_fields',
    });
  }

  try {
    // Create and save a new message
    const newMessage = new Message({
      userId,
      message,
    });
    const savedMessage = await newMessage.save();

    // Process the message
    const processedMessage = `User said: "${message}"`;

    // Send the processed message to OpenAI
    const openAIResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', 
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Answer the user’s query or respond naturally based on the input.',
          },
          { role: 'user', content: processedMessage },
        ],
        max_tokens: 150, 
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    // Extract OpenAI response
    const openAIResult = openAIResponse.data.choices[0].message.content.trim();

    // Update the processedMessage and OpenAI response in the database
    savedMessage.processedMessage = processedMessage;
    savedMessage.openAIResponse = openAIResult;
    await savedMessage.save();

    // Return the response
    return res.status(200).json({
      message: 'Message processed successfully',
      data: {
        id: savedMessage._id,
        originalMessage: savedMessage.message,
        processedMessage: savedMessage.processedMessage,
        openAIResponse: savedMessage.openAIResponse,
      },
    });
  } catch (error) {
    console.error('Error processing message:', error.response?.data || error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: 'internal_error',
    });
  }
};

module.exports = sendMessageService;

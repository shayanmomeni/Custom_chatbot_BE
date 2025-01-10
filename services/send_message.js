const Message = require('../models/Message');

const sendMessageService = async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    return res.status(400).json({
      message: 'Message and userId are required',
      error_code: 'missing_fields',
    });
  }

  try {
    // Create a new message document
    const newMessage = new Message({
      userId,
      message,
    });

    // Save to the database
    const savedMessage = await newMessage.save();

    // Process the message (mock processing for now)
    const processedMessage = `Processed version of: "${message}"`;

    // Update the processedMessage field
    savedMessage.processedMessage = processedMessage;
    await savedMessage.save();

    return res.status(200).json({
      message: 'Message processed successfully',
      data: {
        id: savedMessage._id,
        originalMessage: savedMessage.message,
        processedMessage: savedMessage.processedMessage,
      },
    });
  } catch (error) {
    console.error('Error saving message:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: 'internal_error',
    });
  }
};

module.exports = sendMessageService;

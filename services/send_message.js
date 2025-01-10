const sendMessageService = async (req, res) => {
    const { message, userId } = req.body;

    if (!message || !userId) {
        return res.status(400).json({
            message: 'Message and userId are required',
            error_code: 'missing_fields',
        });
    }

    try {
        // Mock response (Replace this later with actual database and OpenAI logic)
        const mockResponse = `Mock response to your message: "${message}"`;

        return res.status(200).json({
            message: 'Message processed successfully',
            error_code: 'none',
            data: mockResponse,
        });
    } catch (err) {
        console.error('Error processing message:', err);
        return res.status(500).json({
            message: 'Internal server error',
            error_code: 'internal_error',
        });
    }
};

module.exports = sendMessageService;

const UserResponse = require("../models/UserResponse");

const getUserResponses = async (req, res) => {
    const { userId, conversationId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
    }

    try {
        const query = { userId };
        if (conversationId) {
            query.conversationId = conversationId; // Filter by conversationId if provided
        }

        const responses = await UserResponse.find(query).sort({ timestamp: 1 });
        if (responses.length === 0) {
            return res.status(404).json({ message: "No responses found for this user." });
        }

        res.status(200).json({
            message: "Responses retrieved successfully",
            data: responses,
        });
    } catch (error) {
        console.error("[Backend] Error retrieving user responses:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};

module.exports = getUserResponses;
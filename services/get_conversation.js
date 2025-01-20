const UserResponse = require("../models/UserResponse");

const getUserResponses = async (req, res) => {
    const { userId, conversationId, page = 1, limit = 10 } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
    }

    try {
        const query = { userId };
        if (conversationId) {
            query.conversationId = conversationId;
        }

        const total = await UserResponse.countDocuments(query);
        const responses = await UserResponse.find(query)
            .sort({ timestamp: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        if (responses.length === 0) {
            return res.status(404).json({ message: "No conversations found for this user." });
        }

        // Group responses by conversationId
        const groupedResponses = responses.reduce((acc, response) => {
            if (!acc[response.conversationId]) {
                acc[response.conversationId] = [];
            }
            acc[response.conversationId].push(response);
            return acc;
        }, {});

        const data = Object.entries(groupedResponses).map(([conversationId, responses]) => ({
            conversationId,
            responses,
        }));

        res.status(200).json({
            message: "Conversations retrieved successfully",
            data,
            pagination: { total, page: parseInt(page), limit: parseInt(limit) },
        });
    } catch (error) {
        console.error("[Backend] Error retrieving user responses:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};

module.exports = getUserResponses;
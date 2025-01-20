const UserResponse = require("../models/UserResponse");

const getUserResponses = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
    }

    try {
        const responses = await UserResponse.find({ userId }).sort({ timestamp: 1 });
        if (responses.length === 0) {
            return res.status(404).json({ message: "No conversations found for this user." });
        }

        res.status(200).json({ message: "Conversations retrieved successfully", data: responses });
    } catch (error) {
        console.error("[Backend] Error retrieving user responses:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};

module.exports = getUserResponses;
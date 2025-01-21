const UserResponse = require("../models/UserResponse");

const getUserResponses = async (req, res) => {
  const { userId, conversationId, page = 1, limit = 10 } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const query = conversationId
      ? { userId, conversationId }
      : { userId };

    const aggregatedData = await UserResponse.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$conversationId",
          userId: { $first: "$userId" },
          responses: {
            $push: {
              questionKey: "$questionKey",
              response: "$response",
              timestamp: "$timestamp",
            },
          },
        },
      },
      { $sort: { _id: 1 } }, // Sort by conversationId
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
    ]);

    if (!aggregatedData.length) {
      return res
        .status(404)
        .json({ message: "No conversations found for this user." });
    }

    const totalCount = await UserResponse.countDocuments(query);

    res.status(200).json({
      message: "Conversations retrieved successfully",
      data: aggregatedData.map((item) => ({
        conversationId: item._id,
        userId: item.userId,
        responses: item.responses,
      })),
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("[Backend] Error retrieving user responses:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

module.exports = getUserResponses;
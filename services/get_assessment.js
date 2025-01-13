const User = require('../models/User');

const getAssessment = async (req, res) => {
  const { userId } = req.query;

  // Validate input
  if (!userId) {
    return res.status(400).json({
      message: 'User ID is required',
      error_code: 'missing_user_id',
    });
  }

  try {
    // Find user and return assessment answers
    const user = await User.findById(userId, 'assessmentAnswers');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Assessment answers retrieved successfully',
      data: user.assessmentAnswers || [],
    });
  } catch (error) {
    console.error('Error fetching assessment answers:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: error.code || 'internal_error',
    });
  }
};

module.exports = getAssessment;
const User = require('../models/User');

const saveAssessment = async (req, res) => {
  const { userId, answers } = req.body;

  // Validate input
  if (!userId) {
    return res.status(400).json({
      message: 'User ID is required',
      error_code: 'missing_user_id',
    });
  }
  if (!Array.isArray(answers) || answers.length !== 10 || answers.some(answer => typeof answer !== 'string')) {
    return res.status(400).json({
      message: 'Answers must be an array of exactly 10 strings.',
      error_code: 'invalid_answers',
    });
  }

  try {
    // Find user and update assessmentAnswers
    const user = await User.findByIdAndUpdate(
      userId,
      { assessmentAnswers: answers },
      { new: true } // Return the updated user document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Assessment answers saved successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error saving assessment:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: error.code || 'internal_error',
    });
  }
};

module.exports = saveAssessment;

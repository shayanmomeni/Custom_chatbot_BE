const User = require('../models/User');

const saveSelfAspects = async (req, res) => {
  const { userId, aspects } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: 'User ID is required',
      error_code: 'missing_user_id',
    });
  }

  if (!Array.isArray(aspects) || aspects.length !== 6) {
    return res.status(400).json({
      message: 'Exactly 6 self-aspects are required.',
      error_code: 'invalid_aspects_length',
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        error_code: 'user_not_found',
      });
    }

    user.selectedAspects = aspects;
    user.assessment_aspect_completed = user.assessmentAnswers.length === 12;
    await user.save();

    return res.status(200).json({
      message: 'Self-aspects saved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error saving self-aspects:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: 'internal_error',
    });
  }
};

module.exports = saveSelfAspects;
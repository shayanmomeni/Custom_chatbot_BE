const User = require('../models/User');

const saveSelfAspects = async (req, res) => {
  const { userId, aspects } = req.body;

  // Validate input
  if (!userId || !aspects || aspects.length !== 10) {
    return res.status(400).json({
      message: 'User ID and exactly 10 aspects are required',
      error_code: 'invalid_data',
    });
  }

  try {
    // Find user and update selectedAspects
    const user = await User.findByIdAndUpdate(
      userId,
      { selectedAspects: aspects },
      { new: true } // Return the updated user document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Selected aspects saved successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error saving self-aspects:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: 'internal_error',
    });
  }
};

module.exports = saveSelfAspects;

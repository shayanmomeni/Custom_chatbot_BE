const User = require('../models/User');

const updateUserStatus = async (req, res) => {
  const { userId, imagesUploaded } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: 'User ID is required',
      error_code: 'missing_user_id',
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { imagesUploaded },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        error_code: 'user_not_found',
      });
    }

    return res.status(200).json({
      message: 'User status updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error updating user status:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: error.code || 'internal_error',
    });
  }
};

module.exports = updateUserStatus;
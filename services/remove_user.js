const User = require('../models/User'); // Use the User model

const removeUserService = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      message: 'User ID is required',
      error_code: 'missing_user_id',
    });
  }

  try {
    // Remove user by ID using mongoose
    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Error removing user:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: 'database_error',
    });
  }
};

module.exports = removeUserService;

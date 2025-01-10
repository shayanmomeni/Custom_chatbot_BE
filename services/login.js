const User = require('../models/User'); // Use the User model
const { generateToken } = require('../utils/jwt');
const { verifyPassword } = require('../utils/password');

const loginService = async (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Username and password are required',
    });
  }

  try {
    // Find user by username using mongoose
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Login failed: user not found' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Login failed: incorrect password' });
    }

    // Generate JWT token
    const token = generateToken({ username });

    return res.status(200).json({
      message: 'Login successful',
      token,
      userDetails: {
        username: user.username,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Database error' });
  }
};

module.exports = loginService;

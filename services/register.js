const User = require('../models/User'); // Use the User model
const { generateToken } = require('../utils/jwt');
const { hashPassword } = require('../utils/password');

const registerService = async (req, res) => {
  console.log('Received register request:', req.body);
  const { username, password, fullName } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      message: 'Username and password are required',
      error_code: 'missing_fields',
    });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        error_code: 'user_exists',
      });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create and save the new user
    const newUser = new User({
      username,
      password: hashedPassword,
      fullName,
    });
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = generateToken({ username });

    return res.status(201).json({
      message: 'User registered successfully',
      data: {
        id: savedUser._id,
        username: savedUser.username,
        token,
      },
    });
  } catch (error) {
    console.error('Error during registration:', error.message);
    return res.status(500).json({
      message: 'Database error',
      error_code: 'database_error',
    });
  }
};

module.exports = registerService;

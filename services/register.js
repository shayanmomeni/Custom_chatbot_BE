const connectToMongoDB = require('../database');
const { generateToken } = require('../utils/jwt');
const { hashPassword } = require('../utils/password');

const registerService = async (req, res) => {
  console.log('Received register request:', req.body);
  const { username, password, fullName } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Username and password are required',
      error_code: 'missing_fields',
    });
  }

  try {
    const db = await connectToMongoDB();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
        error_code: 'user_exists',
      });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Insert new user
    const result = await db.collection('users').insertOne({
      username,
      password: hashedPassword,
      fullName,
    });

    // Generate JWT token
    const token = generateToken({ username });

    return res.status(201).json({
      message: 'User registered successfully',
      data: {
        acknowledged: result.acknowledged,
        insertedId: result.insertedId,
        token,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      message: 'Database error',
      error_code: 'database_error',
    });
  }
};

module.exports = registerService;

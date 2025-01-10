const jwt = require('jsonwebtoken');
const MongoClient = require('mongodb').MongoClient;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRY_SECONDS;

const registerService = async (req, res) => {
    console.log('Received register request:', req.body);
    const { username, password, fullName } = req.body;

    // Validate input
    if (!username || !password) {
        console.log('Missing username or password');
        return res.status(400).json({
            message: 'Username and password are required', 
            error_code: 'missing_fields',
        });
    }

    try {
        const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(process.env.DB_NAME);

        // Check if the user already exists
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            client.close();
            return res.status(400).json({
                message: 'User already exists',
                error_code: 'user_exists',
            });
        }

        // Create new user
        const result = await db.collection('users').insertOne({ username, password, fullName });

        // Generate JWT token
        const token = jwt.sign({ username }, jwtSecret, {
            algorithm: 'HS256',
            expiresIn: parseInt(jwtExpirySeconds) || jwtExpirySeconds // Ensure it's a number or valid string
        });

        client.close();

        return res.status(201).json({ 
            message: 'User registered successfully', 
            error_code: 'none',
            data: {
                acknowledged: result.acknowledged,
                insertedId: result.insertedId,
                token: token
            }
        });
    } catch (err) {
        console.log('Database error:', err);
        return res.status(500).json({
            message: 'Database error',
            error_code: 'database_error',
        });
    }
}

module.exports = registerService;
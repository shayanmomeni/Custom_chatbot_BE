const jwt = require('jsonwebtoken');
const MongoClient = require('mongodb').MongoClient;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRY_SECONDS;

const loginService = async (req, res) => {
    console.log('Received login request:', req.body);
    const { username, password } = req.body;

    try {
        const client = await MongoClient.connect(process.env.MONGO_URL);
        const db = client.db(process.env.DB_NAME);

        // Find user by username
        const user = await db.collection('users').findOne({ username });
        client.close();
        if (!user) {
            console.log('Login failed: user not found');
            return res.status(401).send('Login failed: user not found');
        }

        if (user.password !== password) {
            console.log('Login failed: incorrect password');
            return res.status(401).send('Login failed: incorrect password');
        }

        // Generate JWT token
        const token = jwt.sign({ username }, jwtSecret, {
            algorithm: 'HS256',
            expiresIn: parseInt(jwtExpirySeconds) || jwtExpirySeconds // Ensure it's a number or valid string
        });

        console.log('Login successful');
        return res.status(200).json({ 
            message: 'Login successful', 
            token,
            userDetails: {
                username: user.username,
                fullName: user.fullName
            }
        });
    } catch (err) {
        console.log('Database error:', err);
        return res.status(500).send('Database error');
    }
}

module.exports = loginService;
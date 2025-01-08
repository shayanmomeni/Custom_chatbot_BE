require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const http = require('http');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Variables
const port = process.env.PORT || 3000;

// RESTful API Routes
// Home Route
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Register Route
app.post('/register', async (req, res) => {
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
        const client = await MongoClient.connect(process.env.MONGO_URL);
        const db = client.db(process.env.DB_NAME);
        const user = { username, password, fullName };

        // Check if the username already exists
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            console.log('Username already exists');
            client.close();
            return res.status(400).json({
                message: 'Username already exists',
                error_code: 'username_exists',
            });
        }

        // Insert new user into the collection
        const result = await db.collection('users').insertOne(user);
        client.close();
        console.log('User registered successfully:', result);
        return res.status(200).json({
            message: 'User registered successfully',
            error_code: 'none',
            data: result,
        });
    } catch (err) {
        console.log('Database error:', err);
        return res.status(500).send('Database error');
    }
});

// Login Route
app.post('/login', async (req, res) => {
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

        console.log('Login successful');
        return res.send('Login successful');
    } catch (err) {
        console.log('Database error:', err);
        return res.status(500).send('Database error');
    }
});

// Server Listener
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
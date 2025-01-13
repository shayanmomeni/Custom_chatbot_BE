require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger.json');
const connectToMongoDB = require('./database');
const app = express();
const server = http.createServer(app);

// Services
const registerService = require('./services/register');
const loginService = require('./services/login');
const removeUserService = require('./services/remove_user');
const sendMessageService = require('./services/send_message');
const saveAssessment = require('./services/assessment');
const saveSelfAspects = require('./services/self_aspects');
const getAssessment = require('./services/get_assessment');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware (centralized)
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Variables
const port = process.env.PORT || 8000;

// RESTful API Routes

// Home Route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Authentication Routes
app.post('/login', loginService);
app.post('/register', registerService);

// User Management Routes
app.delete('/user/:userId', removeUserService);

// Message Route
app.post('/send-message', sendMessageService);

// Assessment Routes
app.put('/assessment', saveAssessment);
app.get('/assessment', getAssessment);

// Self-Aspects Routes
app.put('/self-aspects', saveSelfAspects);

// Connect to MongoDB
connectToMongoDB();

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
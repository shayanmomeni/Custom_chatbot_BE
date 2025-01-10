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

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Variables
const port = process.env.PORT;

// RESTful API Routes

// Home Route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Login Route
app.post('/login', loginService);

// Register Route
app.post('/register', registerService);

// Remove User Route
app.delete('/user/:userId', removeUserService);

// Message Route
app.post('/send-message', sendMessageService);

// Connect to MongoDB
connectToMongoDB(); 

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

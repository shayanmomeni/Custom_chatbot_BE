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

// Authentication Routes
app.post('/login', loginService);
app.post('/register', registerService);

// User Management Routes
app.delete('/user/:userId', removeUserService);

// Message Route
app.post('/send-message', sendMessageService);

// Assessment and Self-Aspects Routes
app.put('/assessment', saveAssessment); 
app.put('/self-aspects', saveSelfAspects); 

// Connect to MongoDB
connectToMongoDB(); 

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === "production"
  ? "./env/production.env"
  : "./env/development.env";
require("dotenv").config({ path: envPath });

const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger/swagger.json");
const connectToMongoDB = require("./database");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Variables
const port = process.env.PORT || 8000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;

// Serve static files from the "resources" directory
app.use('/resources', express.static(path.join(__dirname, 'resources')));

// Example: Constructing image URLs
// Ensure `userId` and `fileName` are defined when constructing this URL
// const imageUrl = `${BASE_URL}/resources/images/${userId}/${fileName}`;

// Services
const registerService = require("./services/register");
const loginService = require("./services/login");
const removeUserService = require("./services/remove_user");
const sendMessageService = require("./services/send_message");
const saveAssessment = require("./services/assessment");
const saveSelfAspects = require("./services/self_aspects");
const getAssessment = require("./services/get_assessment");
const getUserResponses = require("./services/get_user_responses");
const getConversation = require("./services/get_conversation");
const getConversationSummary = require("./services/get_conversation_summary");

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve images statically
app.use(
  "/resources/images",
  express.static(path.join(__dirname, "resources/images"))
);
console.log(`[Server] Serving images from: ${path.join(__dirname, "resources/images")}`);

// Swagger setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware (centralized)
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  if (process.env.NODE_ENV === "development") {
    console.error("Error Stack:", err.stack);
  }

  res.status(500).json({ message: "Internal Server Error" });
});

// RESTful API Routes

// Home Route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Authentication Routes
app.post("/login", loginService);
app.post("/register", registerService);

// User Management Routes
app.delete("/user/:userId", removeUserService);

// Message Route
app.post("/send-message", sendMessageService);

// Assessment Routes
app.put("/assessment", saveAssessment);
app.get("/assessment", getAssessment);

// Self-Aspects Routes
app.put("/self-aspects", saveSelfAspects);

// Conversation Retrieval Routes
app.get("/userresponses", getUserResponses);
app.get("/conversation", getConversation);

// Route to retrieve conversation summaries with full details
app.get("/conversation-summary", getConversationSummary);

// Connect to MongoDB
connectToMongoDB();

// Start server
server.listen(port, () => {
  console.log(`[Server] Running on port ${port}`);
});

// Additional Debugging for Development
if (process.env.NODE_ENV === "development") {
  console.log("[Server] Application is running in development mode.");
  console.log(`[Server] API documentation available at: ${BASE_URL}/api-docs`);
  console.log(`[Server] Static files served at: ${BASE_URL}/resources/images`);
}

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
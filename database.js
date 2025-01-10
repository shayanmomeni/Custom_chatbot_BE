require('dotenv').config();
const mongoose = require('mongoose');

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME, // Keep only the relevant option
    });
    console.log(`Connected to MongoDB at ${process.env.MONGO_URL}/${process.env.DB_NAME}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit process if connection fails
  }
};

module.exports = connectToMongoDB;

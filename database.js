require('dotenv').config();
const { MongoClient } = require('mongodb');

const mongoUrl = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

let client;

const connectToMongoDB = async () => {
  if (!client) {
    client = new MongoClient(`${mongoUrl}/${dbName}`);
    await client.connect();
    console.log(`Connected to MongoDB at ${mongoUrl}/${dbName}`);
  }
  return client.db(dbName);
};

module.exports = connectToMongoDB;

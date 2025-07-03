const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection string from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/video-transcoder';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
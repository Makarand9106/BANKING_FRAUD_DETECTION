import mongoose from 'mongoose';
import logger from './logger.js';


export const connectDB = async () => {
  const maxAttempts = 3;
  const delayMs = 5000;
  const MONGO_URI = process.env.MONGO_URI;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`Attempting MongoDB connection... (Attempt ${attempt}/${maxAttempts})`);
      const conn = await mongoose.connect(MONGO_URI);
      logger.info(`MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt} failed: %s`, error.message);
      if (attempt < maxAttempts) {
        logger.info(`Waiting ${delayMs / 1000}s before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logger.error('All MongoDB connection attempts exhausted.');
        throw error;
      }
    }
  }
};

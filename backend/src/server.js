import dotenv from 'dotenv';
// Load environment variables at the absolute entry point of the process
dotenv.config();

import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Step 1: Secure database connection
    await connectDB();

    // Step 2: Initialize raw HTTP server around Express App
    const httpServer = createServer(app);

    // Step 3: Register websocket handler bounds
    initSocket(httpServer);

    // Step 4: Listen for incoming connections
    httpServer.listen(PORT, () => {
      logger.info('===========================================================');
      logger.info(`Banking Fraud Detection System Backend is operational.`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Port:        ${PORT}`);
      logger.info('===========================================================');
    });
  } catch (error) {
    logger.error('CRITICAL: Failed to bootstrap backend server: %s', error.stack || error.message);
    process.exit(1);
  }
};

startServer();

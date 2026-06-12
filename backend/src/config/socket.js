import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './logger.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const fraudNamespace = io.of('/fraud');

  // Verify JWT authorization credentials during connection handshake
  fraudNamespace.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      logger.warn('Socket connection rejected on /fraud namespace: credentials omitted');
      return next(new Error('Authentication failed: token required'));
    }

    try {
      const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'your_jwt_secret_here');
      socket.user = decoded;
      next();
    } catch (err) {
      logger.warn('Socket connection rejected on /fraud namespace: token verification failed: %s', err.message);
      return next(new Error('Authentication failed: invalid token'));
    }
  });

  fraudNamespace.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket client connected on /fraud namespace: ${socket.id} [User ID: ${user.userId}, Role: ${user.role}]`);

    // Put connections into dedicated rooms
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected from /fraud namespace: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io server instance has not been initialized');
  }
  return io;
};
export default initSocket;

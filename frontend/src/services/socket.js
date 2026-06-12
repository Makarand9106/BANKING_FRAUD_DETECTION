import { io } from 'socket.io-client';

let socket = null;

/**
 * Initializes and connects the Socket.IO client instance using JWT handshake authentication.
 * @param {string} token - The active user accessToken
 * @returns {import('socket.io-client').Socket}
 */
export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  // 🎯 FIX: Point to the backend port (4000) in development, and use relative paths in production
  const socketUrl = import.meta.env.PROD 
    ? '/fraud' 
    : 'http://localhost:4000/fraud';

  socket = io(socketUrl, {
    auth: {
      token: `Bearer ${token}`,
    },
    transports: ['websocket', 'polling'], // Explicitly declare stable transport types
    withCredentials: true,                // Force browser to forward HTTP session cookies
    autoConnect: false,                   // Wait for manual connection step execution
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Automatically kick off the connection pipe handshake loop
  socket.connect();

  return socket;
};

/**
 * Retrieves the current active socket instance.
 * @returns {import('socket.io-client').Socket|null}
 */
export const getSocket = () => socket;

/**
 * Disconnects the socket connection and cleans up the active instance.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Your frontend React application container
    proxy: {
      // 1. Forward all standard REST API calls to the Express server
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      // 2. Forward real-time WebSocket connection upgrades to port 4000
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
      '/fraud': {
        target: 'http://localhost:4000',
        ws: true,
      }
    },
  },
});
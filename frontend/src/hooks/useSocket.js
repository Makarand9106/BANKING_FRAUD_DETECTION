import { useContext } from 'react';
import { AlertContext } from '../context/AlertContext';
import { getSocket } from '../services/socket';

/**
 * Custom hook to retrieve active websocket and link state variables.
 * @returns {{ socket: import('socket.io-client').Socket|null, connected: boolean }}
 */
export const useSocket = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useSocket must be consumed within an AlertProvider bounds');
  }

  return {
    socket: getSocket(),
    connected: context.socketConnected,
  };
};

export default useSocket;

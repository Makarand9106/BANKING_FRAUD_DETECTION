import { useContext } from 'react';
import { AlertContext } from '../context/AlertContext';

/**
 * Custom hook to consume the real-time AlertContext state and actions.
 * @returns {import('../context/AlertContext').AlertContextValue}
 */
export const useFraudAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useFraudAlerts must be consumed within an AlertProvider bounds');
  }
  return context;
};

export default useFraudAlerts;

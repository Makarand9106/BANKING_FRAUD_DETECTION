import { getIo } from '../config/socket.js';

/**
 * Returns the Socket.IO namespace helper for fraud processing
 */
const getFraudNamespace = () => {
  return getIo().of('/fraud');
};

/**
 * Emits transaction creation notification to security operators
 */
export const emitTransactionCreated = (transaction) => {
  getFraudNamespace()
    .to('role:analyst')
    .to('role:manager')
    .to('role:admin')
    .emit('transactionCreated', { transaction });
};

/**
 * Broadcasts critical fraud alert tickets
 */
export const emitNewFraudAlert = (alert, fraudScore) => {
  getFraudNamespace()
    .to('role:analyst')
    .to('role:manager')
    .to('role:admin')
    .emit('newFraudAlert', { alert, fraudScore, timestamp: Date.now() });
};

/**
 * Broadcasts account risk level modifications
 */
export const emitRiskScoreUpdated = (accountId, newScore, topK) => {
  getFraudNamespace().emit('riskScoreUpdated', { accountId, newScore, topK });
};

/**
 * Broadcasts case resolution updates
 */
export const emitAlertResolved = (alertId, resolvedBy) => {
  getFraudNamespace().emit('alertResolved', { alertId, resolvedBy, timestamp: Date.now() });
};

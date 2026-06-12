import Alert from '../models/Alert.js';
import Account from '../models/Account.js';
import FraudPattern from '../models/FraudPattern.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

class AlertService {
  /**
   * Spawns an alert ticket, recalculates risk score, and locks account on critical flags.
   */
  async createAlert({ transactionId, accountId, severity, type, description, signals }) {
    // 1. Create Alert Document
    const alert = new Alert({
      transactionId,
      accountId,
      severity,
      type,
      description,
      resolved: false,
    });
    await alert.save();

    // 2. Perform Account risk score weighting calculations
    const account = await Account.findById(accountId);
    if (account) {
      // Determine the incoming signal score
      let newSignalScore = 0;
      if (signals && signals.length > 0) {
        newSignalScore = signals[0].score;
      } else {
        switch (severity) {
          case 'CRITICAL':
            newSignalScore = 90;
            break;
          case 'HIGH':
            newSignalScore = 70;
            break;
          case 'MEDIUM':
            newSignalScore = 40;
            break;
          case 'LOW':
            newSignalScore = 15;
            break;
          default:
            newSignalScore = 0;
        }
      }

      // Apply formula: weighted = (account.riskScore * 0.7) + (newSignalScore * 0.3)
      const currentScore = account.riskScore || 0;
      const weightedScore = currentScore * 0.7 + newSignalScore * 0.3;
      account.riskScore = Math.min(100, Number(weightedScore.toFixed(2)));

      // 3. Freeze account if severity is HIGH or CRITICAL
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        account.status = 'frozen';
        logger.warn(`Account ${account.accountNumber} has been frozen due to ${severity} severity alert.`);
      }

      await account.save();
      logger.info(`Recalculated Account ${account.accountNumber} risk score from ${currentScore} to ${account.riskScore}`);

      // 4. Create FraudPattern document
      await FraudPattern.create({
        type: ['CYCLE', 'SMURFING', 'DRAIN', 'VELOCITY', 'DORMANT'].includes(type) ? type : 'VELOCITY',
        accountId,
        riskScore: newSignalScore,
        patternMeta: {
          transactionId,
          description,
          severity,
          signals,
        },
        timestamp: new Date(),
      });

      return { alert, account };
    } else {
      logger.warn(`Alert referencing non-existent account ID during creation: ${accountId}`);
      return { alert, account: null };
    }
  }

  /**
   * Resolves an alert incident.
   */
  async resolveAlert(alertId, userId, auditDetails = {}) {
    const alert = await Alert.findById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.resolved = true;
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    await alert.save();

    // Write Audit Log
    await AuditLog.create({
      userId,
      action: 'ALERT_RESOLVE',
      resource: 'Alert',
      resourceId: alert._id.toString(),
      ipAddress: auditDetails.ipAddress || 'unknown',
      userAgent: auditDetails.userAgent || 'unknown',
      result: 'SUCCESS',
      timestamp: new Date(),
    });

    logger.info(`Alert ${alert._id} resolved by user ${userId}`);
    return alert;
  }

  /**
   * Assigns an investigator user to the target alert.
   */
  async assignAlert(alertId, investigatorId, auditDetails = {}) {
    const alert = await Alert.findById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.assignedTo = investigatorId;
    await alert.save();

    // Write Audit Log
    await AuditLog.create({
      userId: auditDetails.userId || investigatorId,
      action: 'ALERT_ASSIGN',
      resource: 'Alert',
      resourceId: alert._id.toString(),
      ipAddress: auditDetails.ipAddress || 'unknown',
      userAgent: auditDetails.userAgent || 'unknown',
      result: 'SUCCESS',
      timestamp: new Date(),
    });

    logger.info(`Alert ${alert._id} assigned to investigator ${investigatorId}`);
    return alert;
  }
}

export default new AlertService();

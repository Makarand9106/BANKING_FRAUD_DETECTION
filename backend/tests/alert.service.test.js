import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import alertService from '../src/services/alert.service.js';
import Account from '../src/models/Account.js';
import Alert from '../src/models/Alert.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fraud_detection_test';

describe('AlertService Suite', () => {
  let tester = null;
  let account = null;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    tester = await User.create({
      email: 'alert_tester@bank.com',
      passwordHash: 'Password123!',
      role: 'analyst'
    });
  }, 60000);

  afterAll(async () => {
    if (tester) {
      await User.deleteMany({ _id: tester._id });
    }
    await Account.deleteMany({});
    await Alert.deleteMany({});
    await AuditLog.deleteMany({});
    await mongoose.connection.close();
  }, 60000);

  beforeEach(async () => {
    await Account.deleteMany({});
    await Alert.deleteMany({});
    await AuditLog.deleteMany({});

    // Create fresh test account
    account = await Account.create({
      accountNumber: 'ACC-ALERT-TEST',
      ownerUserId: tester._id,
      balance: 50000,
      riskScore: 20, // initial risk score
      status: 'active'
    });
  });

  describe('createAlert', () => {
    it('should create alert and freeze account on CRITICAL severity', async () => {
      const transactionId = new mongoose.Types.ObjectId();
      
      const { alert, account: updatedAccount } = await alertService.createAlert({
        transactionId,
        accountId: account._id,
        severity: 'CRITICAL',
        type: 'CYCLE',
        description: 'Critical loop fraud detected.',
        signals: [{ type: 'CYCLE', score: 90 }]
      });

      expect(alert).toBeDefined();
      expect(alert.severity).toBe('CRITICAL');
      expect(alert.resolved).toBe(false);

      // Account should be frozen
      expect(updatedAccount.status).toBe('frozen');
    });

    it('should calculate weighted risk scores accurately', async () => {
      // initial account score = 20
      // alert signal score = 90
      // formula: 20 * 0.7 + 90 * 0.3 = 14 + 27 = 41
      const transactionId = new mongoose.Types.ObjectId();

      const { account: updatedAccount } = await alertService.createAlert({
        transactionId,
        accountId: account._id,
        severity: 'HIGH',
        type: 'VELOCITY',
        description: 'High velocity transfer.',
        signals: [{ type: 'VELOCITY', score: 90 }]
      });

      expect(updatedAccount.riskScore).toBe(41);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert and write audit log', async () => {
      const transactionId = new mongoose.Types.ObjectId();

      const { alert } = await alertService.createAlert({
        transactionId,
        accountId: account._id,
        severity: 'LOW',
        type: 'SMURFING',
        description: 'Low risk smurfing.',
        signals: [{ type: 'SMURFING', score: 20 }]
      });

      const resolvedAlert = await alertService.resolveAlert(
        alert._id,
        tester._id,
        { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
      );

      expect(resolvedAlert.resolved).toBe(true);
      expect(resolvedAlert.resolvedBy.toString()).toBe(tester._id.toString());
      expect(resolvedAlert.resolvedAt).toBeDefined();

      // Check Audit Log
      const audit = await AuditLog.findOne({ action: 'ALERT_RESOLVE' });
      expect(audit).toBeDefined();
      expect(audit.resourceId).toBe(alert._id.toString());
    });
  });
});

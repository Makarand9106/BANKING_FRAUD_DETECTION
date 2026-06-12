import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Account from '../src/models/Account.js';
import Transaction from '../src/models/Transaction.js';
import Alert from '../src/models/Alert.js';
import fraudEngineService from '../src/services/fraud-engine.service.js';

// Mock engine service module
jest.mock('../src/services/fraud-engine.service.js');
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fraud_detection_test';

describe('Transaction REST Endpoints Suite', () => {
  let token = '';
  let operator = null;
  let sourceAccount = null;
  let destAccount = null;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Setup operator profile for authorization headers
    operator = await User.create({
      email: 'tx_tester_operator@bank.com',
      passwordHash: 'Password123!',
      role: 'admin'
    });
    token = operator.generateAccessToken();

    // Setup mock accounts
    sourceAccount = await Account.create({
      accountNumber: 'ACC-TX-SRC',
      ownerUserId: operator._id,
      balance: 100000,
      status: 'active'
    });

    destAccount = await Account.create({
      accountNumber: 'ACC-TX-DST',
      ownerUserId: operator._id,
      balance: 50000,
      status: 'active'
    });
  }, 60000);

  afterAll(async () => {
    if (operator) {
      await User.deleteMany({ _id: operator._id });
    }
    if (sourceAccount && destAccount) {
      await Account.deleteMany({ _id: { $in: [sourceAccount._id, destAccount._id] } });
    }
    await Transaction.deleteMany({});
    await Alert.deleteMany({});
    await mongoose.connection.close();
  }, 60000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/transactions', () => {
    it('should successfully process a normal approved transaction', async () => {
      fraudEngineService.analyze.mockResolvedValue({
        totalScore: 10,
        severity: 'NONE',
        signals: [],
        decision: 'APPROVE',
        topK: []
      });

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: sourceAccount._id.toString(),
          toAccountId: destAccount._id.toString(),
          amount: 5000,
          merchantName: 'Walmart Grocery',
          deviceId: 'DEV-TX-NORMAL',
          location: 'Noida, UP'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.amount).toBe(5000);
      expect(fraudEngineService.analyze).toHaveBeenCalled();
    });

    it('should return 400 validation error for negative amounts', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: sourceAccount._id.toString(),
          toAccountId: destAccount._id.toString(),
          amount: -250,
          merchantName: 'Negative Store'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests without authorization headers', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          fromAccountId: sourceAccount._id.toString(),
          toAccountId: destAccount._id.toString(),
          amount: 1000
        });

      expect(res.status).toBe(401);
    });

    it('should lock account and generate alert on high risk BLOCK decisions', async () => {
      fraudEngineService.analyze.mockResolvedValue({
        totalScore: 85,
        severity: 'HIGH',
        signals: [{ type: 'CYCLE', score: 40, detail: 'Cyclic loop detected' }],
        decision: 'BLOCK',
        topK: []
      });

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: sourceAccount._id.toString(),
          toAccountId: destAccount._id.toString(),
          amount: 8000,
          merchantName: 'Loop Wire Transfer'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('blocked');

      // Assert database alert ticket was created
      const alertTicket = await Alert.findOne({ transactionId: res.body.data._id });
      expect(alertTicket).toBeDefined();
      expect(alertTicket.severity).toBe('HIGH');
      expect(alertTicket.type).toBe('CYCLE');
    });
  });

  describe('GET /api/transactions', () => {
    beforeAll(async () => {
      // Clean previous run and seed 3 test transactions
      await Transaction.deleteMany({});
      const txs = [
        { fromAccountId: sourceAccount._id, toAccountId: destAccount._id, amount: 2000, status: 'completed', isDeleted: false },
        { fromAccountId: sourceAccount._id, toAccountId: destAccount._id, amount: 15000, status: 'flagged', isDeleted: false },
        { fromAccountId: sourceAccount._id, toAccountId: destAccount._id, amount: 800, status: 'blocked', isDeleted: false }
      ];
      await Transaction.insertMany(txs);
    });

    it('should retrieve list with paginated results', async () => {
      const res = await request(app)
        .get('/api/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.total).toBe(3);
    });

    it('should filter logs by status', async () => {
      const res = await request(app)
        .get('/api/transactions?status=flagged')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('flagged');
    });

    it('should filter logs by amount boundaries', async () => {
      const res = await request(app)
        .get('/api/transactions?minAmount=10000')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].amount).toBe(15000);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should retrieve single transaction detail if found', async () => {
      const tx = await Transaction.findOne({});
      const res = await request(app)
        .get(`/api/transactions/${tx._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(tx._id.toString());
    });

    it('should return 404 for missing IDs', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from '../backend/node_modules/mongoose/index.js';
import bcrypt from 'bcryptjs';

// Reconstruct __dirname for ES Modules absolute path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly target the correct .env profile relative to this file's location
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

// Import Mongoose Models
import User from '../backend/src/models/User.js';
import Account from '../backend/src/models/Account.js';
import Transaction from '../backend/src/models/Transaction.js';
import FraudScore from '../backend/src/models/FraudScore.js';
import Alert from '../backend/src/models/Alert.js';
import FraudPattern from '../backend/src/models/FraudPattern.js';
import AuditLog from '../backend/src/models/AuditLog.js';

// Hardcoded connection URL targets FRAUD_DETECTION cluster partition context directly
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://makarand9359_db_user:makarand2006@mdk-v1.hnhhjvu.mongodb.net/";

// Helpers for picking random accounts
const getRandAccount = (accounts, excludeAcc = null) => {
  while (true) {
    const acc = accounts[Math.floor(Math.random() * accounts.length)];
    if (!excludeAcc || acc.accountNumber !== excludeAcc.accountNumber) {
      return acc;
    }
  }
};

const getRandomTimeInPast = (daysBack) => {
  const dayInMs = 24 * 60 * 60 * 1000;
  return new Date(Date.now() - Math.floor(Math.random() * daysBack) * dayInMs - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
};

// ====================================================
// TRANSACTIONS GENERATOR FUNCTIONS
// ====================================================

function generateNormalTransaction(accounts) {
  const fromAcc = getRandAccount(accounts);
  const toAcc = getRandAccount(accounts, fromAcc);
  const amount = Number((Math.random() * (5000 - 500) + 500).toFixed(2));
  const timestamp = getRandomTimeInPast(30);

  const txId = new mongoose.Types.ObjectId();
  const scoreId = new mongoose.Types.ObjectId();

  const transaction = {
    _id: txId,
    fromAccountId: fromAcc._id,
    toAccountId: toAcc._id,
    amount,
    timestamp,
    status: 'completed',
    fraudScoreId: scoreId,
    merchantName: 'Retail Merchant',
    deviceId: `DEV-${Math.floor(Math.random() * 90000) + 10000}`,
    location: 'New Delhi, IN'
  };

  const fraudScore = {
    _id: scoreId,
    transactionId: txId,
    totalScore: Math.floor(Math.random() * 16),
    severity: 'NONE',
    signals: [],
    decision: 'APPROVE',
    analyzedAt: timestamp
  };

  return { transaction, fraudScore };
}

function generateCycleTransactions(accounts) {
  const A = getRandAccount(accounts);
  const B = getRandAccount(accounts, A);
  const C = getRandAccount(accounts, B);

  const baseTime = getRandomTimeInPast(30).getTime();
  const baseAmount = Math.floor(Math.random() * (12000 - 8000 + 1)) + 8000;

  const cycleTxs = [
    { from: A, to: B, amt: baseAmount, delay: 0 },
    { from: B, to: C, amt: Number((baseAmount * 0.95).toFixed(2)), delay: 30 * 60 * 1000 },
    { from: C, to: A, amt: Number((baseAmount * 0.90).toFixed(2)), delay: 60 * 60 * 1000 }
  ];

  const cycleDetailsStr = `Cycle detected involving 3 accounts: ${A.accountNumber} -> ${B.accountNumber} -> ${C.accountNumber} -> ${A.accountNumber}`;

  const transactions = [];
  const fraudScores = [];
  const alerts = [];
  const fraudPatterns = [];

  cycleTxs.forEach((step) => {
    const txId = new mongoose.Types.ObjectId();
    const scoreId = new mongoose.Types.ObjectId();
    const txTime = new Date(baseTime + step.delay);

    transactions.push({
      _id: txId,
      fromAccountId: step.from._id,
      toAccountId: step.to._id,
      amount: step.amt,
      timestamp: txTime,
      status: 'flagged',
      fraudScoreId: scoreId,
      merchantName: 'P2P Transfer',
      deviceId: 'DEV-CYCLE-NODE',
      location: 'Virtual Terminal'
    });

    fraudScores.push({
      _id: scoreId,
      transactionId: txId,
      totalScore: 40,
      severity: 'MEDIUM',
      signals: [{ type: 'CYCLE', score: 40, detail: cycleDetailsStr }],
      decision: 'REVIEW',
      analyzedAt: txTime
    });

    alerts.push({
      transactionId: txId,
      accountId: step.from._id,
      severity: 'MEDIUM',
      type: 'CYCLE',
      description: `Flagged loop contribution from ${step.from.accountNumber} to ${step.to.accountNumber}.`,
      resolved: false
    });

    fraudPatterns.push({
      type: 'CYCLE',
      accountId: step.from._id,
      riskScore: 40,
      patternMeta: {
        transactionId: txId,
        detail: cycleDetailsStr,
        involvedAccounts: [A.accountNumber, B.accountNumber, C.accountNumber, A.accountNumber]
      },
      timestamp: txTime
    });
  });

  return { transactions, fraudScores, alerts, fraudPatterns };
}

function generateSmurfingBatch(accounts) {
  const sender = getRandAccount(accounts);
  const receivers = [];
  while (receivers.length < 7) {
    const r = getRandAccount(accounts, sender);
    if (!receivers.includes(r)) {
      receivers.push(r);
    }
  }

  const baseTime = getRandomTimeInPast(30).getTime();
  let totalSmurfingAmount = 0;
  
  const batchData = receivers.map((rec, idx) => {
    const amt = Math.floor(Math.random() * (9900 - 8000 + 1)) + 8000;
    totalSmurfingAmount += amt;
    return {
      receiver: rec,
      amt,
      delay: idx * 5 * 60 * 1000
    };
  });

  const smurfingDetailStr = `Smurfing pattern: 7 structured transfers to 7 unique recipients totaling ${totalSmurfingAmount} in 60 minutes (each transfer < 10k)`;

  const transactions = [];
  const fraudScores = [];
  const alerts = [];
  const fraudPatterns = [];

  batchData.forEach((item) => {
    const txId = new mongoose.Types.ObjectId();
    const scoreId = new mongoose.Types.ObjectId();
    const txTime = new Date(baseTime + item.delay);

    transactions.push({
      _id: txId,
      fromAccountId: sender._id,
      toAccountId: item.receiver._id,
      amount: item.amt,
      timestamp: txTime,
      status: 'flagged',
      fraudScoreId: scoreId,
      merchantName: 'Structured Wiring',
      deviceId: 'DEV-SMURF-WIRE',
      location: 'Branch ATM'
    });

    fraudScores.push({
      _id: scoreId,
      transactionId: txId,
      totalScore: 25,
      severity: 'LOW',
      signals: [{ type: 'SMURFING', score: 25, detail: smurfingDetailStr }],
      decision: 'REVIEW',
      analyzedAt: txTime
    });

    alerts.push({
      transactionId: txId,
      accountId: sender._id,
      severity: 'LOW',
      type: 'SMURFING',
      description: `Structuring alerts: High frequency outbound transfers below tracking limit.`,
      resolved: false
    });

    fraudPatterns.push({
      type: 'SMURFING',
      accountId: sender._id,
      riskScore: 25,
      patternMeta: {
        transactionId: txId,
        detail: smurfingDetailStr,
        recipientCount: 7,
        totalAmount: totalSmurfingAmount
      },
      timestamp: txTime
    });
  });

  return { transactions, fraudScores, alerts, fraudPatterns };
}

function generateFraudRing(accounts) {
  const ringNodes = [];
  while (ringNodes.length < 5) {
    const acc = getRandAccount(accounts);
    if (!ringNodes.includes(acc)) {
      ringNodes.push(acc);
    }
  }

  const baseTime = getRandomTimeInPast(30).getTime();
  
  const transactions = [];
  const fraudScores = [];
  const alerts = [];
  const fraudPatterns = [];

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i === j) continue;
      
      const from = ringNodes[i];
      const to = ringNodes[j];
      const amount = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
      const txTime = new Date(baseTime + Math.floor(Math.random() * 6 * 60 * 60 * 1000));

      const txId = new mongoose.Types.ObjectId();
      const scoreId = new mongoose.Types.ObjectId();

      transactions.push({
        _id: txId,
        fromAccountId: from._id,
        toAccountId: to._id,
        amount,
        timestamp: txTime,
        status: 'blocked',
        fraudScoreId: scoreId,
        merchantName: 'Ring Clearing',
        deviceId: 'DEV-RING-MEMBER',
        location: 'Remote IP'
      });

      fraudScores.push({
        _id: scoreId,
        transactionId: txId,
        totalScore: 75,
        severity: 'HIGH',
        signals: [
          { type: 'CYCLE', score: 40, detail: 'Cycle loops identified in dense transactional ring cluster.' },
          { type: 'PROPAGATION', score: 35, detail: 'Risk propagation warning: Node connected to high-risk ring.' }
        ],
        decision: 'BLOCK',
        analyzedAt: txTime
      });

      alerts.push({
        transactionId: txId,
        accountId: from._id,
        severity: 'HIGH',
        type: 'CYCLE',
        description: `High risk fraud cluster activity detected involving ring nodes.`,
        resolved: false
      });

      fraudPatterns.push({
        type: 'CYCLE',
        accountId: from._id,
        riskScore: 75,
        patternMeta: {
          transactionId: txId,
          detail: `Dense transactional ring cluster between ${ringNodes.map(x => x.accountNumber).join(', ')}.`
        },
        timestamp: txTime
      });
    }
  }

  return { transactions, fraudScores, alerts, fraudPatterns };
}

function generateBalanceDrain(accounts) {
  const source = getRandAccount(accounts);
  
  let balanceVal = source.balance;
  if (balanceVal < 150000) {
    balanceVal = Math.floor(Math.random() * (300000 - 150000 + 1)) + 150000;
    source.balance = balanceVal;
  }

  const receivers = [];
  while (receivers.length < 4) {
    const r = getRandAccount(accounts, source);
    if (!receivers.includes(r)) {
      receivers.push(r);
    }
  }

  const baseTime = getRandomTimeInPast(30).getTime();
  const outgoingTotal = Math.floor(balanceVal * 0.82); // 82% drain
  const singleAmt = Number((outgoingTotal / 4).toFixed(2));

  const drainDetailStr = `Balance drain: Outgoing total ${outgoingTotal} in last 30 minutes drains 82% of current account balance (${balanceVal})`;

  const transactions = [];
  const fraudScores = [];
  const alerts = [];
  const fraudPatterns = [];

  for (let idx = 0; idx < 4; idx++) {
    const rec = receivers[idx];
    const txId = new mongoose.Types.ObjectId();
    const scoreId = new mongoose.Types.ObjectId();
    const txTime = new Date(baseTime + idx * 5 * 60 * 1000);

    transactions.push({
      _id: txId,
      fromAccountId: source._id,
      toAccountId: rec._id,
      amount: singleAmt,
      timestamp: txTime,
      status: 'blocked',
      fraudScoreId: scoreId,
      merchantName: 'Direct Cash Transfer',
      deviceId: 'DEV-DRAIN-CLEANOUT',
      location: 'Suspicious Terminal'
    });

    fraudScores.push({
      _id: scoreId,
      transactionId: txId,
      totalScore: 30,
      severity: 'LOW',
      signals: [{ type: 'DRAIN', score: 30, detail: drainDetailStr }],
      decision: 'BLOCK',
      analyzedAt: txTime
    });

    alerts.push({
      transactionId: txId,
      accountId: source._id,
      severity: 'LOW',
      type: 'DRAIN',
      description: `Suspicious cleanout activity draining account assets in under 30 minutes.`,
      resolved: false
    });

    fraudPatterns.push({
      type: 'DRAIN',
      accountId: source._id,
      riskScore: 30,
      patternMeta: {
        transactionId: txId,
        detail: drainDetailStr,
        drainRatio: 0.82,
        outgoingAmount: outgoingTotal
      },
      timestamp: txTime
    });
  }

  return { transactions, fraudScores, alerts, fraudPatterns };
}

// ====================================================
// MAIN SEED INGESTION LOGIC
// ====================================================

async function seed() {
  console.log('Connecting to MongoDB Cloud (FRAUD_DETECTION)...');
  
  // Set configuration parameters to prevent connection buffering bugs
  mongoose.set('bufferCommands', false);
  
  await mongoose.connect(MONGO_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000
  });
  
  console.log('Connected successfully to database:', mongoose.connection.name);

  // 1. Clear All Collections via direct model reference execution loops
  console.log('Purging historical documentation grids...');
  
  await Promise.all([
    Transaction.deleteMany({}),
    Account.deleteMany({}),
    FraudScore.deleteMany({}),
    Alert.deleteMany({}),
    FraudPattern.deleteMany({}),
    AuditLog.deleteMany({}),
    User.deleteMany({})
  ]);
  
  console.log('✅ Remote storage collections dropped clean.');

  // 2. Hash Password Once
  console.log('Hashing default credentials password using bcryptjs...');
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 3. Seed Users
  console.log('Inserting platform execution operator profiles...');
  const usersToInsert = [];
  
  for (let i = 1; i <= 3; i++) usersToInsert.push({ email: `admin${i}@bank.com`, passwordHash, role: 'admin', isActive: true });
  for (let i = 1; i <= 4; i++) usersToInsert.push({ email: `manager${i}@bank.com`, passwordHash, role: 'manager', isActive: true });
  for (let i = 1; i <= 3; i++) usersToInsert.push({ email: `analyst${i}@bank.com`, passwordHash, role: 'analyst', isActive: true });

  const seededUsers = await User.insertMany(usersToInsert);
  const analysts = seededUsers.filter(u => u.role === 'analyst');
  console.log(`Seeded ${seededUsers.length} active platform profiles.`);

  // 4. Seed Accounts (ACC-001 to ACC-500)
  console.log('Generating 500 mock ledger account indexes...');
  const accountsToInsert = [];
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i <= 500; i++) {
    const accountNumber = `ACC-${String(i).padStart(3, '0')}`;
    const balance = Math.floor(Math.random() * (500000 - 10000 + 1)) + 10000;
    const lastActiveAt = new Date(now - Math.floor(Math.random() * 180) * dayInMs);
    const status = Math.random() < 0.95 ? 'active' : 'frozen';
    const ownerUserId = analysts[Math.floor(Math.random() * analysts.length)]._id;

    accountsToInsert.push({
      accountNumber,
      ownerUserId,
      balance,
      status,
      lastActiveAt,
      riskScore: 0,
      totalTransactions: 0
    });
  }

  const seededAccounts = await Account.insertMany(accountsToInsert);
  console.log(`Seeded ${seededAccounts.length} core customer ledger accounts.`);

  // Prepare insertion storage buffers
  const transactionsToInsert = [];
  const fraudScoresToInsert = [];
  const alertsToInsert = [];
  const fraudPatternsToInsert = [];

  // 5. Generate Normal Transactions (3500)
  console.log('Assembling Baseline Transaction pipelines (3500 items)...');
  for (let i = 0; i < 3500; i++) {
    const { transaction, fraudScore } = generateNormalTransaction(seededAccounts);
    transactionsToInsert.push(transaction);
    fraudScoresToInsert.push(fraudScore);
  }

  // 6. Generate Cycle Transactions (501 total)
  console.log('Compiling 3-Node Circular Loop Transactions (501 items)...');
  for (let c = 0; c < 167; c++) {
    const { transactions, fraudScores, alerts, fraudPatterns } = generateCycleTransactions(seededAccounts);
    transactionsToInsert.push(...transactions);
    fraudScoresToInsert.push(...fraudScores);
    alertsToInsert.push(...alerts);
    fraudPatternsToInsert.push(...fraudPatterns);
  }

  // 7. Generate Smurfing Transactions (497 total)
  console.log('Assembling High Frequency Structured Wire Transfers (497 items)...');
  for (let b = 0; b < 71; b++) {
    const { transactions, fraudScores, alerts, fraudPatterns } = generateSmurfingBatch(seededAccounts);
    transactionsToInsert.push(...transactions);
    fraudScoresToInsert.push(...fraudScores);
    alertsToInsert.push(...alerts);
    fraudPatternsToInsert.push(...fraudPatterns);
  }

  // 8. Generate Fraud Rings (300 total)
  console.log('Assembling Dense Graph Fractional Clearing Clusters (300 items)...');
  for (let r = 0; r < 15; r++) {
    const { transactions, fraudScores, alerts, fraudPatterns } = generateFraudRing(seededAccounts);
    transactionsToInsert.push(...transactions);
    fraudScoresToInsert.push(...fraudScores);
    alertsToInsert.push(...alerts);
    fraudPatternsToInsert.push(...fraudPatterns);
  }

  // 9. Generate Balance Drains (200 total)
  console.log('Assembling Asset Account High Leverage Liquidations (200 items)...');
  for (let d = 0; d < 50; d++) {
    const { transactions, fraudScores, alerts, fraudPatterns } = generateBalanceDrain(seededAccounts);
    transactionsToInsert.push(...transactions);
    fraudScoresToInsert.push(...fraudScores);
    alertsToInsert.push(...alerts);
    fraudPatternsToInsert.push(...fraudPatterns);
  }

  // 10. Execute Bulk Inserts
  console.log(`Writing ${transactionsToInsert.length} core transactions to Atlas cluster...`);
  await Transaction.insertMany(transactionsToInsert);

  console.log(`Writing ${fraudScoresToInsert.length} transaction engine analytics nodes...`);
  await FraudScore.insertMany(fraudScoresToInsert);

  console.log(`Writing ${alertsToInsert.length} real-time dashboard notifications...`);
  await Alert.insertMany(alertsToInsert);

  console.log(`Writing ${fraudPatternsToInsert.length} behavior verification patterns...`);
  await FraudPattern.insertMany(fraudPatternsToInsert);

  // 11. Recalculate and Synchronize Account Stats & Risk Ratings
  console.log('Synchronizing customer database metric states...');
  const accountStats = {};
  
  transactionsToInsert.forEach((tx) => {
    if (tx.fromAccountId) {
      const fromIdStr = tx.fromAccountId.toString();
      accountStats[fromIdStr] = accountStats[fromIdStr] || { count: 0, maxRisk: 0 };
      accountStats[fromIdStr].count++;
    }
    if (tx.toAccountId) {
      const toIdStr = tx.toAccountId.toString();
      accountStats[toIdStr] = accountStats[toIdStr] || { count: 0, maxRisk: 0 };
      accountStats[toIdStr].count++;
    }
  });

  fraudPatternsToInsert.forEach((pat) => {
    const accIdStr = pat.accountId.toString();
    accountStats[accIdStr] = accountStats[accIdStr] || { count: 0, maxRisk: 0 };
    if (pat.riskScore > accountStats[accIdStr].maxRisk) {
      accountStats[accIdStr].maxRisk = pat.riskScore;
    }
  });

  const accountUpdates = Object.keys(accountStats).map((accIdStr) => ({
    updateOne: {
      filter: { _id: accIdStr },
      update: {
        $set: {
          totalTransactions: accountStats[accIdStr].count,
          riskScore: Math.min(100, accountStats[accIdStr].maxRisk)
        }
      }
    }
  }));

  if (accountUpdates.length > 0) {
    console.log(`Pushing bulk data updates across ${accountUpdates.length} nodes...`);
    await Account.bulkWrite(accountUpdates);
  }

  // Create clean initial audit logs
  console.log('Writing structural execution log entries...');
  await AuditLog.create({
    userId: seededUsers[0]._id,
    action: 'SYSTEM_SEED',
    resource: 'Database',
    resourceId: 'All',
    ipAddress: '127.0.0.1',
    userAgent: 'seed-runner-script',
    result: 'SUCCESS',
    details: 'MongoDB database initialized with default operators and 5 fraud test scenarios.'
  });

  console.log('\n======================================================');
  console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY');
  console.log('======================================================');
  console.table({
    'System Users (Admin/Mgr/Anlst)': seededUsers.length,
    'Customer Accounts (ACC-001+)': seededAccounts.length,
    'Transactions Created': transactionsToInsert.length,
    'Fraud Scores Tracked': fraudScoresToInsert.length,
    'Generated Alerts': alertsToInsert.length,
    'Flagged Fraud Patterns': fraudPatternsToInsert.length
  });
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('Database pipeline closed safely.');
}

seed().catch((err) => {
  console.error('CRITICAL: Seeding terminated with fatal exception:', err);
  process.exit(1);
});
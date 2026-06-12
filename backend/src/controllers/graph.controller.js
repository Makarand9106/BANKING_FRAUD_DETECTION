import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import FraudPattern from '../models/FraudPattern.js';

class GraphController {
  // GET /api/graph/snapshot
  async getSnapshot(req, res, next) {
    try {
      const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 1. Fetch accounts active in the last 24 hours
      const activeAccounts = await Account.find({
        lastActiveAt: { $gte: activeThreshold },
      });

      // 2. Fetch transactions from the last 24 hours that are flagged or blocked
      const suspiciousTransactions = await Transaction.find({
        timestamp: { $gte: activeThreshold },
        status: { $in: ['flagged', 'blocked'] },
        isDeleted: false,
      });

      // 3. Build Nodes list
      const nodes = activeAccounts.map((acc) => ({
        id: acc._id.toString(),
        accountNumber: acc.accountNumber,
        riskScore: acc.riskScore || 0,
        severity:
          acc.riskScore >= 85
            ? 'CRITICAL'
            : acc.riskScore >= 60
            ? 'HIGH'
            : acc.riskScore >= 30
            ? 'MEDIUM'
            : acc.riskScore > 0
            ? 'LOW'
            : 'NONE',
        balance: acc.balance,
        lastActiveAt: acc.lastActiveAt,
        flagged: (acc.riskScore || 0) >= 60,
      }));

      // Gather missing nodes referenced by transactions to prevent isolated visual breaks
      const loadedNodeIds = new Set(nodes.map((n) => n.id));
      const missingAccountIds = [];

      for (const tx of suspiciousTransactions) {
        if (tx.fromAccountId && !loadedNodeIds.has(tx.fromAccountId.toString())) {
          missingAccountIds.push(tx.fromAccountId);
          loadedNodeIds.add(tx.fromAccountId.toString());
        }
        if (tx.toAccountId && !loadedNodeIds.has(tx.toAccountId.toString())) {
          missingAccountIds.push(tx.toAccountId);
          loadedNodeIds.add(tx.toAccountId.toString());
        }
      }

      if (missingAccountIds.length > 0) {
        const extraAccounts = await Account.find({ _id: { $in: missingAccountIds } });
        for (const acc of extraAccounts) {
          nodes.push({
            id: acc._id.toString(),
            accountNumber: acc.accountNumber,
            riskScore: acc.riskScore || 0,
            severity:
              acc.riskScore >= 85
                ? 'CRITICAL'
                : acc.riskScore >= 60
                ? 'HIGH'
                : acc.riskScore >= 30
                ? 'MEDIUM'
                : acc.riskScore > 0
                ? 'LOW'
                : 'NONE',
            balance: acc.balance,
            lastActiveAt: acc.lastActiveAt,
            flagged: (acc.riskScore || 0) >= 60,
          });
        }
      }

      // 4. Build Links list
      const links = suspiciousTransactions.map((tx) => ({
        id: tx._id.toString(),
        source: tx.fromAccountId ? tx.fromAccountId.toString() : 'EXTERNAL_IN',
        target: tx.toAccountId ? tx.toAccountId.toString() : 'EXTERNAL_OUT',
        amount: tx.amount,
        timestamp: tx.timestamp,
        flagged: tx.status === 'flagged' || tx.status === 'blocked',
      }));

      // 5. Query latest CYCLE patterns for suspicious path highlighting
      const cycles = await FraudPattern.find({
        type: 'CYCLE',
        timestamp: { $gte: activeThreshold },
      }).sort({ timestamp: -1 });

      const suspiciousPaths = cycles.map((c) => ({
        patternId: c._id.toString(),
        score: c.riskScore,
        path: c.patternMeta?.involvedAccounts || c.patternMeta?.path || [],
      }));

      return res.status(200).json({
        success: true,
        data: {
          nodes,
          links,
          suspiciousPaths,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GraphController();

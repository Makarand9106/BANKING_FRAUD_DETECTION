import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Alert from '../models/Alert.js';
import FraudPattern from '../models/FraudPattern.js';

class AccountController {
  // GET /api/accounts/:id
  async getAccount(req, res, next) {
    try {
      const accountId = req.params.id;
      let account;
      if (mongoose.Types.ObjectId.isValid(accountId)) {
        account = await Account.findById(accountId).populate('ownerUserId', 'email role isActive');
      } else {
        account = await Account.findOne({ accountNumber: accountId }).populate('ownerUserId', 'email role isActive');
      }

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found',
        });
      }

      // Aggregate last 30 transactions for this account (inbound or outbound)
      const transactions = await Transaction.find({
        $or: [
          { fromAccountId: account._id },
          { toAccountId: account._id },
        ],
        isDeleted: false,
      })
        .sort({ timestamp: -1 })
        .limit(30)
        .populate('fraudScoreId');

      // Fetch alert history
      const alerts = await Alert.find({ accountId: account._id })
        .sort({ createdAt: -1 });

      // Fetch latest FraudPatterns
      const patterns = await FraudPattern.find({ accountId: account._id })
        .sort({ timestamp: -1 })
        .limit(10);

      return res.status(200).json({
        success: true,
        data: {
          account,
          transactions,
          alerts,
          patterns,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/accounts/top-suspicious
  async getTopSuspicious(req, res, next) {
    try {
      // Find top 10 suspicious accounts based on riskScore
      const accounts = await Account.find({})
        .sort({ riskScore: -1 })
        .limit(10)
        .populate('ownerUserId', 'email role');

      const data = [];

      for (const account of accounts) {
        // Query the single latest alert for this account
        const latestAlert = await Alert.findOne({ accountId: account._id })
          .sort({ createdAt: -1 });

        data.push({
          account,
          latestAlert: latestAlert || null,
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/accounts/:id/status
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!['active', 'frozen'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Mode must be active or frozen.',
        });
      }

      const accountId = req.params.id;
      const account = mongoose.Types.ObjectId.isValid(accountId)
        ? await Account.findById(accountId)
        : await Account.findOne({ accountNumber: accountId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found.',
        });
      }

      account.status = status;
      await account.save();

      return res.status(200).json({
        success: true,
        message: `Account status updated to ${status} successfully.`,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AccountController();

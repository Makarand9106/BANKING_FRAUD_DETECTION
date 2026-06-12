import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import FraudScore from '../models/FraudScore.js';
import FraudPattern from '../models/FraudPattern.js';
import Account from '../models/Account.js';
import AuditLog from '../models/AuditLog.js';
import fraudEngineService from '../services/fraud-engine.service.js';
import alertService from '../services/alert.service.js';
import { emitTransactionCreated, emitNewFraudAlert, emitRiskScoreUpdated } from '../socket/socket.handler.js';
import logger from '../config/logger.js';

class TransactionController {
  // POST /api/transactions
  async createTransaction(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { fromAccountId, toAccountId, amount, timestamp, deviceId, location, merchantName } = req.body;

      // 1. Resolve accounts and verify balances for outbound transfers
      let fromAcc = null;
      let toAcc = null;

      if (fromAccountId) {
        fromAcc = await Account.findById(fromAccountId).session(session);
        if (!fromAcc) {
          await session.abortTransaction();
          return res.status(404).json({ success: false, message: 'Source account not found' });
        }
        if (fromAcc.status === 'frozen') {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Source account is frozen' });
        }
        // Apply simulator context overrides if provided
        if (req.body.balance !== undefined) {
          fromAcc.balance = Number(req.body.balance);
        }
        if (req.body.lastActiveAt !== undefined) {
          fromAcc.lastActiveAt = new Date(req.body.lastActiveAt);
        }
        if (req.body.balance !== undefined || req.body.lastActiveAt !== undefined) {
          await fromAcc.save({ session });
        }
        if (fromAcc.balance < amount) {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Insufficient funds in source account' });
        }
      }

      if (toAccountId) {
        toAcc = await Account.findById(toAccountId).session(session);
        if (!toAcc) {
          await session.abortTransaction();
          return res.status(404).json({ success: false, message: 'Destination account not found' });
        }
        if (toAcc.status === 'frozen') {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Destination account is frozen' });
        }
      }

      // Create transaction document (status: pending)
      const transaction = new Transaction({
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
        amount,
        timestamp: timestamp || new Date(),
        deviceId: deviceId || null,
        location: location || null,
        merchantName: merchantName || null,
        status: 'pending',
        isDeleted: false,
      });

      await transaction.save({ session });

      // 2. Map payload and invoke C++ engine analyzer
      const transactionDataForEngine = {
        transactionId: transaction._id.toString(),
        from: fromAccountId ? fromAccountId.toString() : '',
        to: toAccountId ? toAccountId.toString() : '',
        amount: transaction.amount,
        timestamp: transaction.timestamp ? new Date(transaction.timestamp).getTime() : Date.now(),
        balance: fromAcc ? fromAcc.balance : 0,
        lastActiveAt: fromAcc && fromAcc.lastActiveAt ? new Date(fromAcc.lastActiveAt).getTime() : 0,
      };

      const analysis = await fraudEngineService.analyze(transactionDataForEngine);
      const { totalScore, severity, signals, decision } = analysis;

      // 3. Create FraudScore document
      const fraudScore = new FraudScore({
        transactionId: transaction._id,
        totalScore,
        severity,
        signals,
        decision,
        analyzedAt: new Date(),
      });
      await fraudScore.save({ session });

      // Link score to transaction
      transaction.fraudScoreId = fraudScore._id;

      // 4. Save FraudPatterns if signals exist
      if (signals && signals.length > 0) {
        for (const sig of signals) {
          const pattern = new FraudPattern({
            type: sig.type,
            accountId: fromAccountId || toAccountId,
            riskScore: sig.score,
            patternMeta: {
              detail: sig.detail,
              transactionId: transaction._id,
            },
            timestamp: new Date(),
          });
          await pattern.save({ session });
        }
      }

      // 5. Update Transaction status based on decision
      if (decision === 'BLOCK') {
        transaction.status = 'blocked';
      } else if (decision === 'REVIEW') {
        transaction.status = 'flagged';
      } else {
        transaction.status = 'completed';
        // Adjust Account balances
        if (fromAcc) {
          fromAcc.balance = Number((fromAcc.balance - amount).toFixed(2));
          fromAcc.totalTransactions += 1;
          fromAcc.lastActiveAt = new Date();
          await fromAcc.save({ session });
        }
        if (toAcc) {
          toAcc.balance = Number((toAcc.balance + amount).toFixed(2));
          toAcc.totalTransactions += 1;
          toAcc.lastActiveAt = new Date();
          await toAcc.save({ session });
        }
      }

      await transaction.save({ session });

      // Commit Mongoose transaction
      await session.commitTransaction();
      session.endSession();

      // 6. Handle High or Critical risk alerts
      let alert = null;
      let alertData = null;
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        alertData = await alertService.createAlert({
          transactionId: transaction._id,
          accountId: fromAccountId || toAccountId,
          severity,
          type: signals[0]?.type || 'VELOCITY',
          description: signals[0]?.detail || 'High risk transaction detected by C++ engine.',
          signals,
        });
        alert = alertData.alert;
      }

      // 7. Emit WebSockets events
      try {
        emitTransactionCreated(transaction);

        if (alert) {
          emitNewFraudAlert(alert, fraudScore);
        }

        // Notify score updates
        const updatedScore = alertData?.account ? alertData.account.riskScore : (fromAcc ? fromAcc.riskScore : 0);
        emitRiskScoreUpdated(fromAccountId || toAccountId, updatedScore, analysis.topK);
      } catch (err) {
        logger.warn('Failed to emit transaction web sockets event: %s', err.message);
      }

      // Populate fraudScore reference
      const populatedTx = await Transaction.findById(transaction._id)
        .populate('fraudScoreId')
        .populate('fromAccountId')
        .populate('toAccountId');

      return res.status(201).json({
        success: true,
        data: populatedTx,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      next(error);
    }
  }

  // GET /api/transactions (paginated with aggregation pipeline filters)
  async getTransactions(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;

      const {
        status,
        fromAccountId,
        toAccountId,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        minRiskScore,
        maxRiskScore,
        search,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = req.query;

      // Base query: ignore soft deleted records
      const matchStage = { isDeleted: false };

      if (status) matchStage.status = status;

      // Handle ID mappings if they are valid ObjectIds
      if (fromAccountId) {
        matchStage.fromAccountId = new mongoose.Types.ObjectId(fromAccountId);
      }
      if (toAccountId) {
        matchStage.toAccountId = new mongoose.Types.ObjectId(toAccountId);
      }

      // Range amount filters
      if (minAmount || maxAmount) {
        matchStage.amount = {};
        if (minAmount) matchStage.amount.$gte = parseFloat(minAmount);
        if (maxAmount) matchStage.amount.$lte = parseFloat(maxAmount);
      }

      // Range date filters
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }

      // Text search: matches merchantName
      if (search) {
        matchStage.$or = [
          { merchantName: { $regex: search, $options: 'i' } },
        ];
      }

      // Build aggregation steps
      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'fraudscores',
            localField: 'fraudScoreId',
            foreignField: '_id',
            as: 'fraudScore',
          },
        },
        {
          $unwind: {
            path: '$fraudScore',
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      // Post-lookup filter for riskScore
      if (minRiskScore || maxRiskScore) {
        const riskMatch = {};
        if (minRiskScore) riskMatch['fraudScore.totalScore'] = { $gte: parseInt(minRiskScore, 10) };
        if (maxRiskScore) {
          riskMatch['fraudScore.totalScore'] = {
            ...(riskMatch['fraudScore.totalScore'] || {}),
            $lte: parseInt(maxRiskScore, 10),
          };
        }
        pipeline.push({ $match: riskMatch });
      }

      // Sorting
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      let sortKey = 'timestamp';
      if (sortBy === 'amount') sortKey = 'amount';
      if (sortBy === 'riskScore') sortKey = 'fraudScore.totalScore';

      pipeline.push({ $sort: { [sortKey]: sortDirection } });

      // Pagination with Facets
      pipeline.push({
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'accounts',
                localField: 'fromAccountId',
                foreignField: '_id',
                as: 'fromAccount',
              },
            },
            {
              $lookup: {
                from: 'accounts',
                localField: 'toAccountId',
                foreignField: '_id',
                as: 'toAccount',
              },
            },
            {
              $unwind: {
                path: '$fromAccount',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: '$toAccount',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      });

      const results = await Transaction.aggregate(pipeline);
      const data = results[0]?.data || [];
      const total = results[0]?.metadata[0]?.total || 0;
      const pages = Math.ceil(total / limit);

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/transactions/:id
  async getTransaction(req, res, next) {
    try {
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        isDeleted: false,
      })
        .populate('fraudScoreId')
        .populate('fromAccountId')
        .populate('toAccountId');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/transactions/:id/status
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!['pending', 'completed', 'flagged', 'blocked'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status field value supplied',
        });
      }

      const transaction = await Transaction.findOne({ _id: req.params.id, isDeleted: false });
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      const oldStatus = transaction.status;
      transaction.status = status;
      await transaction.save();

      // Write Audit Log
      await AuditLog.create({
        userId: req.user.userId,
        action: 'TRANSACTION_STATUS_UPDATE',
        resource: 'Transaction',
        resourceId: transaction._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        result: 'SUCCESS',
        details: `Status changed from ${oldStatus} to ${status}`,
      });

      logger.info(`Transaction ${transaction._id} status manual update: ${oldStatus} -> ${status}`);

      return res.status(200).json({
        success: true,
        message: 'Transaction status modified successfully',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/transactions/:id
  async deleteTransaction(req, res, next) {
    try {
      const transaction = await Transaction.findOne({ _id: req.params.id, isDeleted: false });
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found or already deleted',
        });
      }

      transaction.isDeleted = true;
      await transaction.save();

      // Write Audit Log
      await AuditLog.create({
        userId: req.user.userId,
        action: 'TRANSACTION_DELETE',
        resource: 'Transaction',
        resourceId: transaction._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        result: 'SUCCESS',
      });

      logger.info(`Transaction ${transaction._id} soft-deleted by user ${req.user.userId}`);

      return res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TransactionController();

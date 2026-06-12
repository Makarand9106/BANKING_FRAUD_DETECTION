import express from 'express';
import { body } from 'express-validator';
import transactionController from '../controllers/transaction.controller.js';
import { verifyAccessToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

const createTransactionSchema = [
  body('fromAccountId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Source Account ID must be a valid Mongo ObjectId'),
  body('toAccountId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Destination Account ID must be a valid Mongo ObjectId'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Transfer amount must be a numeric value greater than zero'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 Date string'),
  body('deviceId')
    .optional()
    .isString()
    .withMessage('Device ID must be a string format'),
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string format'),
  body('merchantName')
    .optional()
    .isString()
    .withMessage('Merchant Name must be a string format'),
  body('balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Balance must be a positive number'),
  body('lastActiveAt')
    .optional()
    .isISO8601()
    .withMessage('Last active date must be a valid ISO 8601 Date string'),
];

const updateStatusSchema = [
  body('status')
    .isIn(['pending', 'completed', 'flagged', 'blocked'])
    .withMessage('Status must be one of: pending, completed, flagged, blocked'),
];

// All transaction routes protected by Access Token checks
router.use(verifyAccessToken);

// POST /api/transactions - Ingest transaction
router.post(
  '/',
  validate(createTransactionSchema),
  transactionController.createTransaction
);

// GET /api/transactions - Query list
router.get(
  '/',
  transactionController.getTransactions
);

// GET /api/transactions/:id - Query single detail
router.get(
  '/:id',
  transactionController.getTransaction
);

// PATCH /api/transactions/:id/status - Update state (Admin/Manager only)
router.patch(
  '/:id/status',
  requireRole('admin', 'manager'),
  validate(updateStatusSchema),
  transactionController.updateStatus
);

// DELETE /api/transactions/:id - Soft-delete (Admin only)
router.delete(
  '/:id',
  requireRole('admin'),
  transactionController.deleteTransaction
);

export default router;

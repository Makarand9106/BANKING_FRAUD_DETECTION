import express from 'express';
import accountController from '../controllers/account.controller.js';
import { verifyAccessToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(verifyAccessToken);

// GET /api/accounts/top-suspicious - Query top 10 risky accounts (put before :id path to prevent routing conflict)
router.get('/top-suspicious', accountController.getTopSuspicious);

// GET /api/accounts/:id - Query account profile & history
router.get('/:id', accountController.getAccount);

// PATCH /api/accounts/:id/status - Update account status (Admin only)
router.patch('/:id/status', requireRole('admin'), accountController.updateStatus);

export default router;

import express from 'express';
import { body } from 'express-validator';
import alertController from '../controllers/alert.controller.js';
import { verifyAccessToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

const resolveAlertSchema = [
  body('resolution')
    .optional()
    .isBoolean()
    .withMessage('Resolution parameter must be a boolean value'),
];

const assignAlertSchema = [
  body('assignedTo')
    .isMongoId()
    .withMessage('Assigned Investigator must be a valid Mongo ObjectId'),
];

router.use(verifyAccessToken);

// GET /api/alerts - Query paginated alerts
router.get('/', alertController.getAlerts);

// GET /api/alerts/:id - Query details
router.get('/:id', alertController.getAlert);

// PATCH /api/alerts/:id/resolve - Resolve active ticket
router.patch(
  '/:id/resolve',
  validate(resolveAlertSchema),
  alertController.resolveAlert
);

// PATCH /api/alerts/:id/assign - Assign investigator user ID
router.patch(
  '/:id/assign',
  validate(assignAlertSchema),
  alertController.assignAlert
);

export default router;

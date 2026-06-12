import express from 'express';
import graphController from '../controllers/graph.controller.js';
import { verifyAccessToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyAccessToken);

// GET /api/graph/snapshot - Build structural snapshot node-link objects
router.get('/snapshot', graphController.getSnapshot);

export default router;

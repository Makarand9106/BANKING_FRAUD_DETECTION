import Alert from '../models/Alert.js';
import User from '../models/User.js';
import alertService from '../services/alert.service.js';
import { emitAlertResolved } from '../socket/socket.handler.js';
import logger from '../config/logger.js';

class AlertController {
  // GET /api/alerts (paginated with filters)
  async getAlerts(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;

      const { severity, type, assignedTo, resolved } = req.query;

      const query = {};

      if (severity) query.severity = severity;
      if (type) query.type = type;
      if (assignedTo) query.assignedTo = assignedTo;
      if (resolved !== undefined) {
        query.resolved = resolved === 'true';
      }

      const total = await Alert.countDocuments(query);
      const alerts = await Alert.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('transactionId')
        .populate('accountId')
        .populate('assignedTo', 'email role')
        .populate('resolvedBy', 'email role');

      const pages = Math.ceil(total / limit);

      return res.status(200).json({
        success: true,
        data: alerts,
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

  // GET /api/alerts/:id
  async getAlert(req, res, next) {
    try {
      const alert = await Alert.findById(req.params.id)
        .populate('transactionId')
        .populate('accountId')
        .populate('assignedTo', 'email role')
        .populate('resolvedBy', 'email role');

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/alerts/:id/resolve
  async resolveAlert(req, res, next) {
    try {
      const alert = await alertService.resolveAlert(req.params.id, req.user.userId, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      // Emit Socket.IO Event
      try {
        emitAlertResolved(alert._id.toString(), req.user.userId);
      } catch (err) {
        logger.warn('Failed to emit alert resolution update event: %s', err.message);
      }

      logger.info(`Alert ${alert._id} resolved by user ${req.user.userId}`);

      return res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/alerts/:id/assign
  async assignAlert(req, res, next) {
    try {
      const { assignedTo } = req.body; // User ID string

      // Verify user exists
      const investigator = await User.findById(assignedTo);
      if (!investigator) {
        return res.status(404).json({
          success: false,
          message: 'Investigator user not found',
        });
      }

      const alert = await alertService.assignAlert(req.params.id, assignedTo, {
        userId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      logger.info(`Alert ${alert._id} assigned to user ${investigator._id}`);

      return res.status(200).json({
        success: true,
        message: 'Alert assigned to investigator successfully',
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AlertController();

import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyAccessToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Rate limiter for sensitive auth routes (register, login)
const strictAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please retry after a minute.',
  },
});

// Validation chains with clear, informative messages
const registerSchema = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address (e.g. user@domain.com)')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one digit')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'analyst'])
    .withMessage('Role must be one of the following: admin, manager, analyst'),
];

const loginSchema = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please supply a valid email address format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Authentication requires password entry'),
];

const changePasswordSchema = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required to execute modification'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('New password must contain at least one digit')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter'),
];

const forgotPasswordSchema = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required to process password resets')
    .normalizeEmail(),
];

const resetPasswordSchema = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email address is required')
    .normalizeEmail(),
  body('otp')
    .trim()
    .isNumeric()
    .withMessage('Verification code must contain digits only')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification OTP must be exactly 6 digits long'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('New password must contain at least one digit')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter'),
];

// POST /api/auth/register
router.post(
  '/register',
  strictAuthLimiter,
  validate(registerSchema),
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  strictAuthLimiter,
  validate(loginSchema),
  authController.login
);

// POST /api/auth/logout
router.post(
  '/logout',
  authController.logout
);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  authController.refreshToken
);

// POST /api/auth/change-password
router.post(
  '/change-password',
  verifyAccessToken,
  validate(changePasswordSchema),
  authController.changePassword
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;

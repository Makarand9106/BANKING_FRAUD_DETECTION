import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

/**
 * Controller class managing security & authentication actions.
 */
class AuthController {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, password, role } = req.body;

      // Check if email already registered
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }

      // Create user (pre-save hook hashes with salt 12)
      const user = new User({
        email,
        passwordHash: password,
        role: role || 'analyst',
      });

      await user.save();

      // Write Audit Log
      await AuditLog.create({
        userId: user._id,
        action: 'USER_REGISTER',
        resource: 'User',
        resourceId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        result: 'SUCCESS',
      });

      logger.info(`New user registered successfully: ${email} [Role: ${user.role}]`);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This user account has been deactivated.',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        // Log authentication failure
        await AuditLog.create({
          userId: user._id,
          action: 'USER_LOGIN_FAILED',
          resource: 'User',
          resourceId: user._id.toString(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'unknown',
          result: 'FAILURE',
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
        });
      }

      // Generate Access & Refresh tokens
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      // Hash Refresh token and save to DB
      const salt = await bcrypt.genSalt(10);
      user.refreshToken = await bcrypt.hash(refreshToken, salt);
      user.lastLogin = new Date();
      await user.save();

      // Set Refresh token cookie (HTTP-only)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Write Audit Log
      await AuditLog.create({
        userId: user._id,
        action: 'USER_LOGIN',
        resource: 'User',
        resourceId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        result: 'SUCCESS',
      });

      logger.info(`User logged in: ${email}`);

      return res.status(200).json({
        success: true,
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/logout
  async logout(req, res, next) {
    try {
      const token = req.cookies?.refreshToken;
      let userId = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_here');
          userId = decoded.userId;
          const user = await User.findById(userId);
          if (user) {
            user.refreshToken = null;
            await user.save();
          }
        } catch (err) {
          logger.warn('Logout token parse issue: %s', err.message);
        }
      }

      // Fallback if access token authenticated but cookie is missing/expired
      if (!userId && req.user) {
        userId = req.user.userId;
        const user = await User.findById(userId);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      if (userId) {
        await AuditLog.create({
          userId,
          action: 'USER_LOGOUT',
          resource: 'User',
          resourceId: userId.toString(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'unknown',
          result: 'SUCCESS',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/refresh-token
  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required.',
        });
      }

      // Verify JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_here');
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token.',
        });
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive || !user.refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'User session invalid or deactivated.',
        });
      }

      // Validate token DB hash matches
      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token verification mismatch.',
        });
      }

      // Generate rotated credentials
      const newAccessToken = user.generateAccessToken();
      const newRefreshToken = user.generateRefreshToken();

      // Update DB hash
      const salt = await bcrypt.genSalt(10);
      user.refreshToken = await bcrypt.hash(newRefreshToken, salt);
      await user.save();

      // Set cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/change-password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User account not found.',
        });
      }

      // Verify old password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        await AuditLog.create({
          userId: user._id,
          action: 'PASSWORD_CHANGE_FAIL',
          resource: 'User',
          resourceId: user._id.toString(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'unknown',
          result: 'FAILURE',
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid current password.',
        });
      }

      // Apply new password and terminate active sessions
      user.passwordHash = newPassword;
      user.refreshToken = null;
      await user.save();

      await AuditLog.create({
        userId: user._id,
        action: 'PASSWORD_CHANGE_SUCCESS',
        resource: 'User',
        resourceId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        result: 'SUCCESS',
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully. Active sessions invalidated.',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/forgot-password
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // Return 404
        return res.status(404).json({
          success: false,
          message: 'No account registered with this email address.',
        });
      }

      // Generate 6 digit numeric code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store hashed otp and expiry in DB
      const salt = await bcrypt.genSalt(10);
      user.otpHash = await bcrypt.hash(otp, salt);
      user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
      await user.save();

      // Log OTP directly to terminal console as requested
      console.log(`\n======================================================`);
      console.log(`[PASSWORD_RESET_OTP] OTP generated for user: ${email}`);
      console.log(`OTP Code:    ${otp}`);
      console.log(`Expires At:  ${user.otpExpiresAt}`);
      console.log(`======================================================\n`);

      logger.info(`Password reset OTP generated for user: ${email}`);

      return res.status(200).json({
        success: true,
        message: 'OTP generated (check server logs)',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account registered with this email address.',
        });
      }

      // Check expiry
      if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Reset OTP has expired or is invalid.',
        });
      }

      // Validate OTP
      const isMatch = await bcrypt.compare(otp, user.otpHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Reset OTP code is incorrect.',
        });
      }

      // Apply new credentials
      user.passwordHash = newPassword;
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.refreshToken = null; // Invalidate current session for safety
      await user.save();

      // Write Audit Log
      await AuditLog.create({
        userId: user._id,
        action: 'PASSWORD_RESET_SUCCESS',
        resource: 'User',
        resourceId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        result: 'SUCCESS',
      });

      logger.info(`Password successfully reset for user: ${email}`);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

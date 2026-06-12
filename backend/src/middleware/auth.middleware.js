import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization header with Bearer token is required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User matching token no longer exists' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is suspended' });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid access token' });
  }
};

export const verifyRefreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_here');
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token' });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

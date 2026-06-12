import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'analyst'],
      default: 'analyst',
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    otpHash: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password if it has been modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate access token
userSchema.methods.generateAccessToken = function () {
  const payload = {
    userId: this._id,
    email: this.email,
    role: this.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret_here', {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const payload = {
    userId: this._id,
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_here', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

const User = mongoose.model('User', userSchema);
export default User;

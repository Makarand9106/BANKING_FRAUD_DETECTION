import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'frozen'],
      default: 'active',
      required: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalTransactions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Account = mongoose.model('Account', accountSchema);
export default Account;

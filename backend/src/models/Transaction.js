import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'flagged', 'blocked'],
      default: 'pending',
      required: true,
    },
    fraudScoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FraudScore',
      default: null,
    },
    merchantName: {
      type: String,
      default: null,
    },
    deviceId: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for velocity queries and reporting
transactionSchema.index({ fromAccountId: 1, timestamp: -1 });
transactionSchema.index({ toAccountId: 1, timestamp: -1 });
transactionSchema.index({ status: 1, timestamp: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;

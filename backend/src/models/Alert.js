import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['CYCLE', 'VELOCITY', 'SMURFING', 'DRAIN', 'DORMANT', 'PROPAGATION'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    resolved: {
      type: Boolean,
      default: false,
      required: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
alertSchema.index({ resolved: 1, severity: -1 });
alertSchema.index({ accountId: 1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;

import mongoose from 'mongoose';

const fraudPatternSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['CYCLE', 'SMURFING', 'DRAIN', 'VELOCITY', 'DORMANT'],
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    patternMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
fraudPatternSchema.index({ type: 1, timestamp: -1 });
fraudPatternSchema.index({ accountId: 1 });

const FraudPattern = mongoose.model('FraudPattern', fraudPatternSchema);
export default FraudPattern;

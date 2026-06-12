import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  detail: {
    type: String,
    default: null,
  },
});

const fraudScoreSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true,
      index: true,
    },
    totalScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    severity: {
      type: String,
      enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'NONE',
      required: true,
    },
    signals: {
      type: [signalSchema],
      default: [],
    },
    decision: {
      type: String,
      enum: ['APPROVE', 'REVIEW', 'BLOCK'],
      default: 'APPROVE',
      required: true,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const FraudScore = mongoose.model('FraudScore', fraudScoreSchema);
export default FraudScore;

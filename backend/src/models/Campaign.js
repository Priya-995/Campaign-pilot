import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    goal: { type: String, default: '' },
    segmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment', required: true },
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'rcs'],
      required: true
    },
    messageTemplate: { type: String, required: true },
    personalizationFields: [{ type: String }],
    offer: {
      type: { type: String, default: 'PERCENTAGE' },
      value: { type: String, default: '10%' }
    },
    status: {
      type: String,
      enum: ['DRAFT', 'QUEUED', 'SENDING', 'COMPLETED', 'FAILED', 'PAUSED'],
      default: 'DRAFT',
      index: true
    },
    targetAudienceSize: { type: Number, default: 0 },
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      converted: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      // Simulated attribution fields — heuristic, not causal
      attributedOrders: { type: Number, default: 0 },
      attributedRevenue: { type: Number, default: 0 }
    },
    launchedAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

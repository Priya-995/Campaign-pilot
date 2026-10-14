import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    channel: { type: String, required: true },
    recipient: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['CREATED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'CLICKED', 'CONVERTED', 'FAILED'],
      default: 'CREATED',
      index: true
    },
    deliveryStatus: { type: String, default: '' },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    clickedAt: { type: Date },
    convertedAt: { type: Date }
  },
  { timestamps: true }
);

export const Communication = mongoose.models.Communication || mongoose.model('Communication', communicationSchema);

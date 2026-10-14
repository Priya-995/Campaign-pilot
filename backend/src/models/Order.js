import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerCustomId: { type: String, index: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true, index: true },
    channel: { type: String, enum: ['whatsapp', 'sms', 'email', 'rcs', 'web', 'app'], default: 'web' },
    status: { type: String, enum: ['COMPLETED', 'PENDING', 'CANCELLED', 'RETURNED'], default: 'COMPLETED' },
    orderedAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

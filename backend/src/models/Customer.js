import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    city: { type: String, required: true, index: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'female' },
    preferredChannel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'rcs'],
      default: 'whatsapp',
      index: true
    },
    totalOrders: { type: Number, default: 0 },
    lifetimeSpend: { type: Number, default: 0 },
    firstOrderAt: { type: Date },
    lastOrderAt: { type: Date, index: true },
    categories: [{ type: String, index: true }]
  },
  { timestamps: true }
);

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

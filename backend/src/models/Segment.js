import mongoose from 'mongoose';

const segmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    filters: { type: Object, required: true },
    estimatedSize: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Segment = mongoose.models.Segment || mongoose.model('Segment', segmentSchema);

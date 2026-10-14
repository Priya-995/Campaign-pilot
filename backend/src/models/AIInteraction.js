import mongoose from 'mongoose';

const aiInteractionSchema = new mongoose.Schema(
  {
    capability: { type: String, required: true },
    inputPrompt: { type: Object, required: true },
    rawOutput: { type: String },
    parsedOutput: { type: Object },
    usedFallback: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const AIInteraction = mongoose.models.AIInteraction || mongoose.model('AIInteraction', aiInteractionSchema);

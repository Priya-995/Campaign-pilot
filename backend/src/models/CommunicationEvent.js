/**
 * CommunicationEvent.js
 * Stores every channel event received from the Channel Simulator.
 * eventId is unique — this is the database-layer idempotency guarantee.
 */

import mongoose from 'mongoose';

const communicationEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    communicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Communication',
      required: true,
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['ACCEPTED', 'DELIVERED', 'OPENED', 'READ', 'CLICKED', 'FAILED', 'CONVERTED'],
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

export const CommunicationEvent =
  mongoose.models.CommunicationEvent ||
  mongoose.model('CommunicationEvent', communicationEventSchema);

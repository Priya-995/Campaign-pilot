import { z } from 'zod';
import { segmentFiltersSchema } from './segmentFilters.schema.js';

export const interpretIntentSchema = z.object({
  goal: z.string(),
  filters: segmentFiltersSchema
});

export const recommendCampaignSchema = z.object({
  recommendedChannel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  reason: z.string(),
  offer: z.object({
    type: z.string(),
    value: z.string()
  }),
  tone: z.string()
});

export const generateMessageSchema = z.object({
  messageTemplate: z.string()
});

export const analyzeCampaignSchema = z.object({
  summary: z.string(),
  strongestPattern: z.string(),
  possibleWeakness: z.string(),
  recommendedNextAction: z.string()
});

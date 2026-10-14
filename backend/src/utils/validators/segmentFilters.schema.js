import { z } from 'zod';

export const segmentFiltersSchema = z.object({
  daysSinceLastOrder: z.object({
    gte: z.number().optional(),
    lte: z.number().optional()
  }).optional(),
  lifetimeSpend: z.object({
    gte: z.number().optional(),
    lte: z.number().optional()
  }).optional(),
  totalOrders: z.object({
    gte: z.number().optional(),
    lte: z.number().optional()
  }).optional(),
  categories: z.object({
    in: z.array(z.string()).optional()
  }).optional(),
  city: z.object({
    in: z.array(z.string()).optional()
  }).optional(),
  preferredChannel: z.object({
    in: z.array(z.string()).optional()
  }).optional(),
  hasPurchased: z.boolean().optional()
}).strict();

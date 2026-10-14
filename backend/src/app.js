import express from 'express';
import cors from 'cors';
import customerRoutes from './routes/customer.routes.js';
import segmentRoutes from './routes/segment.routes.js';
import aiRoutes from './routes/ai.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Health endpoints (both /health and /api/health)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

// Primary API Routes under /api
app.use('/api/customers', customerRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback Route Aliases (in case client requests without /api prefix)
app.use('/customers', customerRoutes);
app.use('/segments', segmentRoutes);
app.use('/ai', aiRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/analytics', analyticsRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

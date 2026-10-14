/**
 * app.js — Express application for the Channel Simulator service.
 * Completely independent from the CRM backend; no shared imports.
 */

import express from 'express';
import cors from 'cors';
import sendRoutes from './routes/send.routes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'channel-simulator',
    timestamp: new Date().toISOString(),
    webhookTarget: process.env.CRM_WEBHOOK_URL || 'http://localhost:5000/api/webhooks'
  });
});

// ─── Core routes ──────────────────────────────────────────────────────────────
app.use('/api/send', sendRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[CHANNEL] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

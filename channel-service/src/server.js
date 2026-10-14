/**
 * server.js — Entry point for the Channel Simulator service.
 * Loads env, starts the HTTP server.
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`[CHANNEL] Channel Simulator service running on port ${PORT}`);
  console.log(`[CHANNEL] Webhook target: ${process.env.CRM_WEBHOOK_URL || 'http://localhost:5000/api/webhooks'}`);
});

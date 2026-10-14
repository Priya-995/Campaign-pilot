import app from './app.js';
import { connectDB } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[Backend Warning] Starting server without DB connection:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Backend] Server listening on port ${PORT}`);
  });
}

startServer();

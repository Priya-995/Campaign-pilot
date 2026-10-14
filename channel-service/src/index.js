import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'channel-service',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[Channel Service] Server listening on port ${PORT}`);
});

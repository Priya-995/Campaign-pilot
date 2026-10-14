import express from 'express';
import {
  interpretIntent,
  recommendCampaign,
  generateMessage,
  analyzeCampaign
} from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/interpret-intent', interpretIntent);
router.post('/recommend-campaign', recommendCampaign);
router.post('/generate-message', generateMessage);
router.post('/analyze-campaign', analyzeCampaign);

export default router;

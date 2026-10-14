import express from 'express';
import {
  createCampaign,
  updateCampaign,
  listCampaigns,
  getCampaign,
  previewCampaignMessages,
  launchCampaign
} from '../controllers/campaign.controller.js';
import { getCampaignAnalytics } from '../controllers/analytics.controller.js';

const router = express.Router();

router.post('/', createCampaign);
router.get('/', listCampaigns);
router.get('/:id', getCampaign);
router.patch('/:id', updateCampaign);
router.get('/:id/preview-messages', previewCampaignMessages);
router.post('/:id/launch', launchCampaign);
router.get('/:id/analytics', getCampaignAnalytics);

export default router;

import express from 'express';
import { previewSegment, createSegment, listSegments, getSegment } from '../controllers/segment.controller.js';

const router = express.Router();

router.post('/preview', previewSegment);
router.post('/', createSegment);
router.get('/', listSegments);
router.get('/:id', getSegment);

export default router;

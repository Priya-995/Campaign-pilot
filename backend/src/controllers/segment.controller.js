import { segmentFiltersSchema } from '../utils/validators/segmentFilters.schema.js';
import * as segmentationService from '../services/segmentation.service.js';

export async function previewSegment(req, res) {
  try {
    const filters = req.body.filters || req.body;
    const validation = segmentFiltersSchema.safeParse(filters);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid filter payload',
        details: validation.error.errors
      });
    }

    const preview = await segmentationService.previewAudience(validation.data);
    return res.status(200).json(preview);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createSegment(req, res) {
  try {
    const { name, description, filters } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Segment name is required' });
    }

    const validation = segmentFiltersSchema.safeParse(filters || {});
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid filter payload',
        details: validation.error.errors
      });
    }

    const segment = await segmentationService.createSegment({
      name,
      description,
      filters: validation.data
    });

    return res.status(201).json(segment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function listSegments(req, res) {
  try {
    const segments = await segmentationService.getSegments();
    return res.status(200).json({ segments });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSegment(req, res) {
  try {
    const segment = await segmentationService.getSegmentById(req.params.id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    return res.status(200).json(segment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

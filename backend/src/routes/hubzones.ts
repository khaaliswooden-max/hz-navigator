import { Router } from 'express';

import { HubzoneService } from '../services/hubzoneService.js';

import type { Request, Response, NextFunction } from 'express';

const router = Router();
const hubzoneService = new HubzoneService();

// GET /api/hubzones - List all HUBZone areas
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const result = await hubzoneService.findAll({
        page: pageNum,
        limit: limitNum,
        search: search as string | undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/hubzones/:id - Get HUBZone by ID
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const hubzone = await hubzoneService.findById(id as string);

      if (!hubzone) {
        res.status(404).json({ error: 'HUBZone not found' });
        return;
      }

      res.json(hubzone);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/hubzones/check - Check if coordinates are in a HUBZone
router.post(
  '/check',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { latitude, longitude } = req.body as {
        latitude: number;
        longitude: number;
      };

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({ error: 'Invalid coordinates' });
        return;
      }

      const result = await hubzoneService.checkLocation(latitude, longitude);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;


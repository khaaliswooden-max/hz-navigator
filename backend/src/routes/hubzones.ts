import { Router } from 'express';

import { HubzoneService } from '../services/hubzoneService.js';

import type { Request, Response, NextFunction } from 'express';

const router = Router();
const hubzoneService = new HubzoneService();

/**
 * @swagger
 * /api/hubzones:
 *   get:
 *     summary: List all HUBZone areas
 *     description: Returns a paginated list of HUBZone designated areas with optional search.
 *     tags: [HUBZones]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: search
 *         in: query
 *         description: Search term to filter HUBZones by name, state, or county
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of HUBZone areas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Hubzone'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
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

/**
 * @swagger
 * /api/hubzones/{id}:
 *   get:
 *     summary: Get HUBZone by ID
 *     description: Returns detailed information about a specific HUBZone area.
 *     tags: [HUBZones]
 *     security: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: HUBZone UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: HUBZone details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hubzone'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /api/hubzones/check:
 *   post:
 *     summary: Check if coordinates are in a HUBZone
 *     description: |
 *       Checks whether the given latitude/longitude coordinates fall within a designated HUBZone area.
 *       Returns all matching HUBZones if the location is in multiple overlapping zones.
 *     tags: [HUBZones]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 38.9072
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -77.0369
 *     responses:
 *       200:
 *         description: HUBZone check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HubzoneCheckResult'
 *       400:
 *         description: Invalid coordinates
 *         content:
 *           application/json:
 *             example:
 *               error: Invalid coordinates
 */
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


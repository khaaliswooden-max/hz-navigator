import { Router } from 'express';

import { db } from '../services/database.js';

import type { Request, Response } from 'express';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'connected' | 'disconnected';
  };
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     description: |
 *       Returns the health status of the API and its dependencies.
 *       Used by load balancers and monitoring systems.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             example:
 *               status: healthy
 *               timestamp: '2024-01-15T12:00:00.000Z'
 *               uptime: 86400.123
 *               services:
 *                 database: connected
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             example:
 *               status: unhealthy
 *               timestamp: '2024-01-15T12:00:00.000Z'
 *               uptime: 86400.123
 *               services:
 *                 database: disconnected
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    await db.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const healthStatus: HealthStatus = {
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
    },
  };

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

export default router;


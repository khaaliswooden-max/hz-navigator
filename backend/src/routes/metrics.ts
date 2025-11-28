/**
 * Metrics and Monitoring Routes
 * 
 * Endpoints for performance metrics, health checks, and monitoring.
 */

import { Router } from 'express';
import {
  metricsHandler,
  healthMetricsHandler,
  getMetrics,
} from '../middleware/performanceMonitor.js';
import { monitoringService } from '../services/monitoringService.js';
import { cacheService } from '../services/cacheService.js';
import { authenticate, requireRole } from '../middleware/auth.js';

import type { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * GET /api/metrics
 * Get performance metrics (admin only)
 */
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  metricsHandler
);

/**
 * GET /api/metrics/health
 * Get health status with metrics
 */
router.get('/health', healthMetricsHandler);

/**
 * GET /api/metrics/detailed
 * Get comprehensive monitoring data (admin only)
 */
router.get(
  '/detailed',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const healthStatus = await monitoringService.getHealthStatus();
      const perfMetrics = getMetrics();
      const cacheStats = cacheService.getStats();
      
      res.json({
        success: true,
        data: {
          health: healthStatus,
          performance: perfMetrics,
          cache: cacheStats,
          alerts: monitoringService.getActiveAlerts(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/metrics/system
 * Get system metrics (admin only)
 */
router.get(
  '/system',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    const systemMetrics = monitoringService.getSystemMetrics();
    
    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/metrics/history
 * Get metrics history for charts (admin only)
 */
router.get(
  '/history',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    const history = monitoringService.getMetricsHistory();
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/metrics/alerts
 * Get active alerts (admin only)
 */
router.get(
  '/alerts',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    const activeAlerts = monitoringService.getActiveAlerts();
    const alertHistory = monitoringService.getAlertHistory();
    
    res.json({
      success: true,
      data: {
        active: activeAlerts,
        history: alertHistory,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/metrics/cache
 * Get cache statistics (admin only)
 */
router.get(
  '/cache',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    const cacheStats = cacheService.getStats();
    
    res.json({
      success: true,
      data: cacheStats,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/metrics/cache/clear
 * Clear cache (admin only)
 */
router.post(
  '/cache/clear',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    cacheService.clear();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/metrics/endpoints
 * Get per-endpoint metrics (admin only)
 */
router.get(
  '/endpoints',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    const metrics = getMetrics();
    
    // Sort by average response time (slowest first)
    const slowestEndpoints = metrics.endpoints
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 20);
    
    // Sort by error rate (highest first)
    const errorProneEndpoints = metrics.endpoints
      .filter(e => e.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);
    
    // Sort by request count (busiest first)
    const busiestEndpoints = metrics.endpoints
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        slowest: slowestEndpoints,
        errorProne: errorProneEndpoints,
        busiest: busiestEndpoints,
        all: metrics.endpoints,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/metrics/status-codes
 * Get HTTP status code distribution (admin only)
 */
router.get(
  '/status-codes',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    const metrics = getMetrics();
    
    // Group status codes
    const grouped = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    };
    
    for (const [code, count] of Object.entries(metrics.statusCodes)) {
      const codeNum = parseInt(code, 10);
      if (codeNum >= 200 && codeNum < 300) grouped['2xx'] += count;
      else if (codeNum >= 300 && codeNum < 400) grouped['3xx'] += count;
      else if (codeNum >= 400 && codeNum < 500) grouped['4xx'] += count;
      else if (codeNum >= 500) grouped['5xx'] += count;
    }
    
    res.json({
      success: true,
      data: {
        detailed: metrics.statusCodes,
        grouped,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export default router;


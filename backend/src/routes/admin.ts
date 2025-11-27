/**
 * Admin Routes
 *
 * Administrative endpoints for system management including
 * HUBZone map update job control and monitoring.
 *
 * All endpoints require admin role authentication.
 *
 * Endpoints:
 * - POST /api/v1/admin/hubzone/update-map   - Trigger manual map update
 * - GET  /api/v1/admin/hubzone/update-status - Get job status
 * - GET  /api/v1/admin/hubzone/execution/:id - Get specific execution
 * - POST /api/v1/admin/hubzone/job/start    - Start scheduled job
 * - POST /api/v1/admin/hubzone/job/stop     - Stop scheduled job
 * - GET  /api/v1/admin/jobs                  - List all jobs
 */

import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../middleware/auth.js';
import { mapUpdateJobManager } from '../jobs/mapUpdateJob.js';

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ===== Validation Schemas =====

const manualTriggerSchema = z.object({
  dry_run: z.boolean().optional().default(false),
  skip_notifications: z.boolean().optional().default(false),
  states: z.array(z.string().length(2)).optional(),
});

const executionIdSchema = z.object({
  id: z.string().uuid(),
});

// ===== Route Handlers =====

/**
 * POST /api/v1/admin/hubzone/update-map
 *
 * Trigger a manual HUBZone map update.
 * Requires admin role.
 *
 * Request body:
 * {
 *   dry_run?: boolean,          // Run without database changes
 *   skip_notifications?: boolean, // Skip business notifications
 *   states?: string[]           // Only process specific states (FIPS codes)
 * }
 *
 * Response:
 * {
 *   executionId: string,
 *   jobId: string,
 *   jobName: string,
 *   status: 'running',
 *   startedAt: Date,
 *   message: string
 * }
 */
router.post(
  '/admin/hubzone/update-map',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = manualTriggerSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: parseResult.error.issues,
        });
        return;
      }

      const { dry_run, skip_notifications, states } = parseResult.data;

      // Check if job is already running
      if (mapUpdateJobManager.isJobRunning()) {
        const currentExecution = mapUpdateJobManager.getCurrentExecution();
        res.status(409).json({
          success: false,
          error: 'Job is already running',
          currentExecution: currentExecution
            ? {
                id: currentExecution.id,
                startedAt: currentExecution.startedAt,
                status: currentExecution.status,
              }
            : null,
        });
        return;
      }

      // Trigger manual execution
      const result = await mapUpdateJobManager.triggerManual({
        jobId: 'hubzone-map-update',
        triggeredBy: req.user?.email ?? req.user?.userId ?? 'admin',
        options: {
          dryRun: dry_run,
          skipNotifications: skip_notifications,
          states,
        },
      });

      res.status(202).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          note: 'Job started successfully. Monitor progress via GET /api/v1/admin/hubzone/update-status',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/admin/hubzone/update-status
 *
 * Get current status of the HUBZone map update job.
 * Requires admin role.
 *
 * Response:
 * {
 *   jobId: string,
 *   jobName: string,
 *   description: string,
 *   enabled: boolean,
 *   cronExpression: string,
 *   cronDescription: string,
 *   lastExecution: JobExecution | null,
 *   nextScheduledRun: Date | null,
 *   currentlyRunning: boolean,
 *   executionHistory: JobExecutionSummary[]
 * }
 */
router.get(
  '/admin/hubzone/update-status',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await mapUpdateJobManager.getStatus();

      res.json({
        success: true,
        data: status,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/admin/hubzone/execution/:id
 *
 * Get details of a specific job execution.
 * Requires admin role.
 *
 * Parameters:
 * - id: Execution UUID
 *
 * Response:
 * {
 *   ...JobExecution
 * }
 */
router.get(
  '/admin/hubzone/execution/:id',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = executionIdSchema.safeParse(req.params);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid execution ID',
          details: parseResult.error.issues,
        });
        return;
      }

      const { id } = parseResult.data;
      const execution = await mapUpdateJobManager.getExecution(id);

      if (!execution) {
        res.status(404).json({
          success: false,
          error: 'Execution not found',
          executionId: id,
        });
        return;
      }

      res.json({
        success: true,
        data: execution,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/admin/hubzone/job/start
 *
 * Start the scheduled HUBZone map update job.
 * Requires admin role.
 *
 * Response:
 * {
 *   message: string,
 *   nextScheduledRun: Date | null
 * }
 */
router.post(
  '/admin/hubzone/job/start',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      mapUpdateJobManager.start();

      const status = await mapUpdateJobManager.getStatus();

      res.json({
        success: true,
        data: {
          message: 'Scheduled job started successfully',
          enabled: status.enabled,
          nextScheduledRun: status.nextScheduledRun,
          cronDescription: status.cronDescription,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/admin/hubzone/job/stop
 *
 * Stop the scheduled HUBZone map update job.
 * Does not affect currently running executions.
 * Requires admin role.
 *
 * Response:
 * {
 *   message: string
 * }
 */
router.post(
  '/admin/hubzone/job/stop',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      mapUpdateJobManager.stop();

      res.json({
        success: true,
        data: {
          message: 'Scheduled job stopped successfully',
          note: 'Any currently running execution will continue to completion',
          currentlyRunning: mapUpdateJobManager.isJobRunning(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/admin/jobs
 *
 * List all scheduled jobs and their status.
 * Requires admin role.
 *
 * Response:
 * {
 *   jobs: JobStatusResponse[]
 * }
 */
router.get(
  '/admin/jobs',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Currently only map update job, but extensible
      const mapUpdateStatus = await mapUpdateJobManager.getStatus();

      res.json({
        success: true,
        data: {
          jobs: [
            {
              ...mapUpdateStatus,
              type: 'map-update',
            },
          ],
          totalJobs: 1,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/admin/system/health
 *
 * Get system health including job status.
 * Requires admin role.
 */
router.get(
  '/admin/system/health',
  authenticate,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { db } = await import('../services/database.js');

      // Check database connectivity
      let dbHealthy = false;
      try {
        await db.query('SELECT 1');
        dbHealthy = true;
      } catch {
        dbHealthy = false;
      }

      // Get job status
      const mapUpdateStatus = await mapUpdateJobManager.getStatus();

      // Get last successful import
      const lastImportQuery = `
        SELECT import_id, completed_at
        FROM hubzone_map_updates
        WHERE status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `;
      const lastImportResult = await db.query<{
        import_id: string;
        completed_at: Date;
      }>(lastImportQuery);

      const lastImport = lastImportResult.rows[0] ?? null;

      res.json({
        success: true,
        data: {
          status: dbHealthy ? 'healthy' : 'degraded',
          components: {
            database: {
              status: dbHealthy ? 'healthy' : 'unhealthy',
            },
            mapUpdateJob: {
              status: mapUpdateStatus.enabled ? 'active' : 'inactive',
              currentlyRunning: mapUpdateStatus.currentlyRunning,
              nextRun: mapUpdateStatus.nextScheduledRun,
              lastRun: mapUpdateStatus.lastExecution?.startedAt ?? null,
            },
          },
          lastHubzoneImport: lastImport
            ? {
                importId: lastImport.import_id,
                completedAt: lastImport.completed_at,
                ageHours: Math.round(
                  (Date.now() - new Date(lastImport.completed_at).getTime()) / (1000 * 60 * 60)
                ),
              }
            : null,
        },
        meta: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          nodeVersion: process.version,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/admin/hubzone/import-history
 *
 * Get history of HUBZone map imports.
 * Requires admin role.
 *
 * Query parameters:
 * - page: Page number (default 1)
 * - limit: Items per page (default 20, max 100)
 */
router.get(
  '/admin/hubzone/import-history',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { db } = await import('../services/database.js');

      const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string, 10) || 20));
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM hubzone_map_updates`;
      const countResult = await db.query<{ count: string }>(countQuery);
      const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

      // Get imports
      const dataQuery = `
        SELECT 
          import_id,
          source_type,
          source_version,
          started_at,
          completed_at,
          status,
          statistics,
          error_message,
          EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000 as duration_ms
        FROM hubzone_map_updates
        ORDER BY started_at DESC
        LIMIT $1 OFFSET $2
      `;

      const dataResult = await db.query<{
        import_id: string;
        source_type: string;
        source_version: string;
        started_at: Date;
        completed_at: Date | null;
        status: string;
        statistics: string | object | null;
        error_message: string | null;
        duration_ms: number | null;
      }>(dataQuery, [limit, offset]);

      res.json({
        success: true,
        data: dataResult.rows.map((row) => ({
          importId: row.import_id,
          sourceType: row.source_type,
          sourceVersion: row.source_version,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          status: row.status,
          statistics:
            typeof row.statistics === 'string'
              ? JSON.parse(row.statistics)
              : row.statistics,
          errorMessage: row.error_message,
          durationMs: row.duration_ms ? Math.round(row.duration_ms) : null,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


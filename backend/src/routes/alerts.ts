import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { alertService } from '../services/alertService.js';

import type { Response, NextFunction } from 'express';
import type { AlertFilterOptions } from '../types/alert.js';

const router = Router();

/**
 * @swagger
 * /api/v1/businesses/{businessId}/alerts:
 *   get:
 *     summary: Get all alerts for a business
 *     description: Returns paginated alerts for a specific business with filtering options.
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BusinessIdParam'
 *       - name: acknowledged
 *         in: query
 *         description: Filter by acknowledged status
 *         schema:
 *           type: boolean
 *       - name: status
 *         in: query
 *         description: Filter by status (comma-separated)
 *         schema:
 *           type: string
 *           example: active,acknowledged
 *       - name: severity
 *         in: query
 *         description: Filter by severity (comma-separated)
 *         schema:
 *           type: string
 *           example: high,critical
 *       - name: type
 *         in: query
 *         description: Filter by alert type (comma-separated)
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ComplianceAlert'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/businesses/:businessId/alerts',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { acknowledged, status, severity, type, page, limit } = req.query;

      const filterOptions: AlertFilterOptions = {
        businessId: businessId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      };

      // Parse acknowledged filter
      if (acknowledged !== undefined) {
        filterOptions.acknowledged = acknowledged === 'true';
      }

      // Parse status filter
      if (status) {
        filterOptions.status = (status as string).split(',') as AlertFilterOptions['status'];
      }

      // Parse severity filter
      if (severity) {
        filterOptions.severity = (severity as string).split(',') as AlertFilterOptions['severity'];
      }

      // Parse type filter
      if (type) {
        filterOptions.type = (type as string).split(',') as AlertFilterOptions['type'];
      }

      const result = await alertService.getAlerts(filterOptions);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
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
 * @swagger
 * /api/v1/businesses/{businessId}/alerts/generate:
 *   post:
 *     summary: Generate compliance alerts for a business
 *     description: Analyzes current compliance status and generates relevant alerts.
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BusinessIdParam'
 *     responses:
 *       201:
 *         description: Alerts generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ComplianceAlert'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     generated:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/businesses/:businessId/alerts/generate',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;

      const alerts = await alertService.generateAlerts(businessId as string);

      res.status(201).json({
        success: true,
        data: alerts,
        meta: {
          generated: alerts.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/alerts/dashboard:
 *   get:
 *     summary: Get alerts dashboard summary
 *     description: Returns aggregated alert statistics for the dashboard view.
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertDashboardSummary'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/alerts/dashboard',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await alertService.getDashboardSummary(req.user?.userId);

      res.json({
        success: true,
        data: summary,
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
 * @swagger
 * /api/v1/alerts/{alertId}:
 *   get:
 *     summary: Get alert by ID
 *     description: Returns detailed information about a specific alert.
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ComplianceAlert'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/alerts/:alertId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { alertId } = req.params;

      const alert = await alertService.getAlertById(alertId as string);

      if (!alert) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Alert not found',
            code: 'ALERT_NOT_FOUND',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
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
 * @swagger
 * /api/v1/alerts/{alertId}/acknowledge:
 *   put:
 *     summary: Acknowledge an alert
 *     description: Marks an alert as acknowledged by the current user.
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ComplianceAlert'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/alerts/:alertId/acknowledge',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        });
        return;
      }

      const alert = await alertService.acknowledgeAlert(alertId as string, userId);

      if (!alert) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Alert not found',
            code: 'ALERT_NOT_FOUND',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
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
 * @swagger
 * /api/v1/alerts/{alertId}:
 *   delete:
 *     summary: Dismiss an alert
 *     description: Marks an alert as dismissed by the current user.
 *     tags: [Alerts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert dismissed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ComplianceAlert'
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/alerts/:alertId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
          },
        });
        return;
      }

      const alert = await alertService.dismissAlert(alertId as string, userId);

      if (!alert) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Alert not found',
            code: 'ALERT_NOT_FOUND',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
        message: 'Alert dismissed successfully',
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
 * POST /api/v1/alerts/:alertId/notifications
 * Send notifications for an alert
 */
router.post(
  '/alerts/:alertId/notifications',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { alertId } = req.params;

      const notifications = await alertService.sendNotifications(alertId as string);

      res.json({
        success: true,
        data: notifications,
        meta: {
          sent: notifications.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users/:userId/notification-preferences
 * Get user notification preferences
 */
router.get(
  '/users/:userId/notification-preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // Users can only view their own preferences (unless admin)
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

      const preferences = await alertService.getUserNotificationPreferences(userId as string);

      res.json({
        success: true,
        data: preferences,
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
 * PUT /api/v1/users/:userId/notification-preferences
 * Update user notification preferences
 */
router.put(
  '/users/:userId/notification-preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // Users can only update their own preferences (unless admin)
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

      const preferences = await alertService.updateNotificationPreferences(
        userId as string,
        req.body
      );

      res.json({
        success: true,
        data: preferences,
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


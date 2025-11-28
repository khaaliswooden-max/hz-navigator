import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { alertService } from '../services/alertService.js';

import type { Response, NextFunction } from 'express';
import type { AlertFilterOptions } from '../types/alert.js';

const router = Router();

/**
 * GET /api/v1/businesses/:businessId/alerts
 * Get all alerts for a specific business
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
 * POST /api/v1/businesses/:businessId/alerts/generate
 * Generate new alerts for a business based on current compliance status
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
 * GET /api/v1/alerts/dashboard
 * Get dashboard summary of all alerts
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
 * GET /api/v1/alerts/:alertId
 * Get a specific alert by ID
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
 * PUT /api/v1/alerts/:alertId/acknowledge
 * Acknowledge an alert
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
 * DELETE /api/v1/alerts/:alertId
 * Dismiss an alert
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


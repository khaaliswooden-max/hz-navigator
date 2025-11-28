/**
 * Email Routes
 * Handle email preferences and unsubscribe endpoints
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { emailPreferencesService } from '../services/emailPreferencesService.js';
import { emailQueueService } from '../services/emailQueueService.js';

const router = Router();

// Validation schemas
const updatePreferencesSchema = z.object({
  complianceAlerts: z.boolean().optional(),
  complianceAlertFrequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
  productUpdates: z.boolean().optional(),
  featureAnnouncements: z.boolean().optional(),
  tipsAndBestPractices: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  weeklyDigestDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
});

/**
 * @swagger
 * /email/preferences:
 *   get:
 *     summary: Get current user's email preferences
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email preferences retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const email = req.user?.email;

      if (!userId || !email) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const preferences = await emailPreferencesService.getOrCreatePreferences(userId, email);

      res.json({
        success: true,
        data: {
          complianceAlerts: preferences.complianceAlerts,
          complianceAlertFrequency: preferences.complianceAlertFrequency,
          productUpdates: preferences.productUpdates,
          featureAnnouncements: preferences.featureAnnouncements,
          tipsAndBestPractices: preferences.tipsAndBestPractices,
          weeklyDigest: preferences.weeklyDigest,
          weeklyDigestDay: preferences.weeklyDigestDay,
          unsubscribedAll: preferences.unsubscribedAll,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/preferences:
 *   put:
 *     summary: Update current user's email preferences
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               complianceAlerts:
 *                 type: boolean
 *               complianceAlertFrequency:
 *                 type: string
 *                 enum: [immediate, daily, weekly]
 *               productUpdates:
 *                 type: boolean
 *               featureAnnouncements:
 *                 type: boolean
 *               tipsAndBestPractices:
 *                 type: boolean
 *               weeklyDigest:
 *                 type: boolean
 *               weeklyDigestDay:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *     responses:
 *       200:
 *         description: Email preferences updated successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validationResult = updatePreferencesSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.errors,
        });
        return;
      }

      const updated = await emailPreferencesService.updatePreferences(userId, validationResult.data);

      res.json({
        success: true,
        message: 'Email preferences updated successfully',
        data: {
          complianceAlerts: updated.complianceAlerts,
          complianceAlertFrequency: updated.complianceAlertFrequency,
          productUpdates: updated.productUpdates,
          featureAnnouncements: updated.featureAnnouncements,
          tipsAndBestPractices: updated.tipsAndBestPractices,
          weeklyDigest: updated.weeklyDigest,
          weeklyDigestDay: updated.weeklyDigestDay,
          unsubscribedAll: updated.unsubscribedAll,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/unsubscribe:
 *   post:
 *     summary: Unsubscribe from emails using token
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Unsubscribe token from email
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/unsubscribe',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ success: false, error: 'Token is required' });
        return;
      }

      const decoded = emailPreferencesService.verifyUnsubscribeToken(token);

      if (!decoded) {
        res.status(400).json({ success: false, error: 'Invalid or expired token' });
        return;
      }

      if (decoded.category) {
        await emailPreferencesService.unsubscribeFromCategory(decoded.userId, decoded.category);
        res.json({
          success: true,
          message: `Successfully unsubscribed from ${decoded.category} emails`,
        });
      } else {
        await emailPreferencesService.unsubscribeAll(decoded.userId);
        res.json({
          success: true,
          message: 'Successfully unsubscribed from all marketing emails',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/unsubscribe-all:
 *   post:
 *     summary: Unsubscribe from all non-transactional emails
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from all emails
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/unsubscribe-all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await emailPreferencesService.unsubscribeAll(userId);

      res.json({
        success: true,
        message: 'Successfully unsubscribed from all non-transactional emails',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/queue/stats:
 *   get:
 *     summary: Get email queue statistics (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get(
  '/queue/stats',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check admin role
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const stats = await emailQueueService.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/queue/failed:
 *   get:
 *     summary: Get failed email jobs (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: end
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Failed jobs retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get(
  '/queue/failed',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const start = parseInt(req.query.start as string) || 0;
      const end = parseInt(req.query.end as string) || 10;

      const failed = await emailQueueService.getFailedJobs(start, end);

      res.json({
        success: true,
        data: failed,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/queue/retry/{jobId}:
 *   post:
 *     summary: Retry a failed email job (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retried successfully
 *       404:
 *         description: Job not found
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post(
  '/queue/retry/:jobId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const { jobId } = req.params;
      const success = await emailQueueService.retryJob(jobId);

      if (!success) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Job queued for retry',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /email/queue/retry-all:
 *   post:
 *     summary: Retry all failed email jobs (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All failed jobs retried
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post(
  '/queue/retry-all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const count = await emailQueueService.retryAllFailed();

      res.json({
        success: true,
        message: `${count} jobs queued for retry`,
        count,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


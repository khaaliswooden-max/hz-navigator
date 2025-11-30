import { db } from './database.js';

/**
 * Notification types
 */
export type NotificationType =
  | 'compliance_alert'
  | 'application_update'
  | 'map_update'
  | 'system_announcement'
  | 'certificate_expiry'
  | 'employee_update'
  | 'document_update'
  | 'verification_result'
  | 'reminder'
  | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationCategory = 'compliance' | 'business' | 'certification' | 'system' | 'general';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface NotificationFilters {
  type?: NotificationType[];
  category?: NotificationCategory[];
  priority?: NotificationPriority[];
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface NotificationsListResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  userId: '',
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  categories: {
    compliance: { enabled: true, email: true, push: true, sms: false },
    business: { enabled: true, email: true, push: true, sms: false },
    certification: { enabled: true, email: true, push: true, sms: true },
    system: { enabled: true, email: false, push: true, sms: false },
    general: { enabled: true, email: false, push: true, sms: false },
  },
  quietHoursEnabled: false,
};

/**
 * Notification Service
 * 
 * Manages user notifications, preferences, and delivery
 */
export class NotificationService {
  /**
   * Create a new notification for a user
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: Notification = {
      id,
      userId: input.userId,
      type: input.type,
      category: input.category,
      priority: input.priority || 'medium',
      title: input.title,
      message: input.message,
      read: false,
      dismissed: false,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      metadata: input.metadata,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
    };

    // Store in database
    await db.run(
      `INSERT INTO notifications (
        id, user_id, type, category, priority, title, message,
        read, dismissed, action_url, action_label, metadata,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.category,
        notification.priority,
        notification.title,
        notification.message,
        notification.read ? 1 : 0,
        notification.dismissed ? 1 : 0,
        notification.actionUrl || null,
        notification.actionLabel || null,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
        notification.createdAt.toISOString(),
        notification.expiresAt?.toISOString() || null,
      ]
    );

    // Check if we should send push/email based on preferences
    await this.sendNotificationDelivery(notification);

    return notification;
  }

  /**
   * Create notifications for multiple users (e.g., system announcements)
   */
  async createBulkNotifications(
    userIds: string[],
    input: Omit<CreateNotificationInput, 'userId'>
  ): Promise<number> {
    let created = 0;

    for (const userId of userIds) {
      try {
        await this.createNotification({ ...input, userId });
        created++;
      } catch (error) {
        console.error(`Failed to create notification for user ${userId}:`, error);
      }
    }

    return created;
  }

  /**
   * Get notifications for a user with pagination and filters
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      filters?: NotificationFilters;
    } = {}
  ): Promise<NotificationsListResult> {
    const { page = 1, limit = 20, unreadOnly = false, filters } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ? AND dismissed = 0';
    const params: (string | number)[] = [userId];

    if (unreadOnly) {
      whereClause += ' AND read = 0';
    }

    if (filters?.type?.length) {
      whereClause += ` AND type IN (${filters.type.map(() => '?').join(',')})`;
      params.push(...filters.type);
    }

    if (filters?.category?.length) {
      whereClause += ` AND category IN (${filters.category.map(() => '?').join(',')})`;
      params.push(...filters.category);
    }

    if (filters?.priority?.length) {
      whereClause += ` AND priority IN (${filters.priority.map(() => '?').join(',')})`;
      params.push(...filters.priority);
    }

    if (filters?.read !== undefined) {
      whereClause += ' AND read = ?';
      params.push(filters.read ? 1 : 0);
    }

    if (filters?.startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(filters.endDate.toISOString());
    }

    // Exclude expired notifications
    whereClause += ' AND (expires_at IS NULL OR expires_at > ?)';
    params.push(new Date().toISOString());

    // Get total count
    const countResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // Get unread count
    const unreadResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND dismissed = 0 AND read = 0 
       AND (expires_at IS NULL OR expires_at > ?)`,
      [userId, new Date().toISOString()]
    );
    const unreadCount = unreadResult?.count || 0;

    // Get notifications
    const rows = await db.all<Notification[]>(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY 
         CASE priority 
           WHEN 'urgent' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           ELSE 4 
         END,
         created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const notifications = rows.map(this.mapRowToNotification);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      hasMore: offset + notifications.length < total,
    };
  }

  /**
   * Get a single notification by ID
   */
  async getNotification(id: string, userId: string): Promise<Notification | null> {
    const row = await db.get<Notification>(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    return row ? this.mapRowToNotification(row) : null;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = ? AND dismissed = 0 AND read = 0 
       AND (expires_at IS NULL OR expires_at > ?)`,
      [userId, new Date().toISOString()]
    );
    return result?.count || 0;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const now = new Date();

    await db.run(
      'UPDATE notifications SET read = 1, read_at = ? WHERE id = ? AND user_id = ?',
      [now.toISOString(), id, userId]
    );

    return this.getNotification(id, userId);
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();

    const result = await db.run(
      `UPDATE notifications SET read = 1, read_at = ? 
       WHERE id IN (${placeholders}) AND user_id = ?`,
      [now, ...ids, userId]
    );

    return result.changes || 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const now = new Date().toISOString();

    const result = await db.run(
      'UPDATE notifications SET read = 1, read_at = ? WHERE user_id = ? AND read = 0',
      [now, userId]
    );

    return result.changes || 0;
  }

  /**
   * Dismiss a notification (soft delete)
   */
  async dismissNotification(id: string, userId: string): Promise<void> {
    await db.run(
      'UPDATE notifications SET dismissed = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  /**
   * Delete a notification permanently
   */
  async deleteNotification(id: string, userId: string): Promise<void> {
    await db.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(
      `DELETE FROM notifications WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );

    return result.changes || 0;
  }

  /**
   * Clear all read notifications for a user
   */
  async clearReadNotifications(userId: string): Promise<number> {
    const result = await db.run(
      'DELETE FROM notifications WHERE user_id = ? AND read = 1',
      [userId]
    );

    return result.changes || 0;
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired(): Promise<number> {
    const result = await db.run(
      'DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < ?',
      [new Date().toISOString()]
    );

    return result.changes || 0;
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await db.get<{ preferences: string }>(
      'SELECT preferences FROM notification_preferences WHERE user_id = ?',
      [userId]
    );

    if (row) {
      return JSON.parse(row.preferences);
    }

    // Return default preferences
    return { ...DEFAULT_PREFERENCES, userId };
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId);
    const updated = { ...existing, ...preferences, userId };

    await db.run(
      `INSERT OR REPLACE INTO notification_preferences (user_id, preferences, updated_at)
       VALUES (?, ?, ?)`,
      [userId, JSON.stringify(updated), new Date().toISOString()]
    );

    return updated;
  }

  /**
   * Send notification via configured channels (email, push, etc.)
   */
  private async sendNotificationDelivery(notification: Notification): Promise<void> {
    try {
      const preferences = await this.getPreferences(notification.userId);
      const categoryPrefs = preferences.categories[notification.category];

      if (!categoryPrefs?.enabled) return;

      // Check quiet hours
      if (preferences.quietHoursEnabled && this.isQuietHours(preferences)) {
        return;
      }

      // Send email if enabled
      if (preferences.emailEnabled && categoryPrefs.email) {
        await this.sendEmailNotification(notification);
      }

      // Send push if enabled
      if (preferences.pushEnabled && categoryPrefs.push) {
        await this.sendPushNotification(notification);
      }

      // Send SMS if enabled (typically only for urgent/high priority)
      if (
        preferences.smsEnabled &&
        categoryPrefs.sms &&
        (notification.priority === 'urgent' || notification.priority === 'high')
      ) {
        await this.sendSmsNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send notification delivery:', error);
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Send email notification (placeholder - integrate with email service)
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    // TODO: Integrate with email service (SendGrid, SES, etc.)
    console.info(`[Email] Would send notification to user ${notification.userId}:`, notification.title);
  }

  /**
   * Send push notification (placeholder - integrate with push service)
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    // TODO: Integrate with push service (FCM, OneSignal, etc.)
    console.info(`[Push] Would send notification to user ${notification.userId}:`, notification.title);
  }

  /**
   * Send SMS notification (placeholder - integrate with SMS service)
   */
  private async sendSmsNotification(notification: Notification): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    console.info(`[SMS] Would send notification to user ${notification.userId}:`, notification.title);
  }

  /**
   * Map database row to Notification object
   */
  private mapRowToNotification(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as NotificationType,
      category: row.category as NotificationCategory,
      priority: row.priority as NotificationPriority,
      title: row.title as string,
      message: row.message as string,
      read: Boolean(row.read),
      dismissed: Boolean(row.dismissed),
      actionUrl: row.action_url as string | undefined,
      actionLabel: row.action_label as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      readAt: row.read_at ? new Date(row.read_at as string) : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
    };
  }

  // ============================================
  // Notification Creation Helpers
  // ============================================

  /**
   * Create a compliance alert notification
   */
  async notifyComplianceAlert(
    userId: string,
    alertData: {
      title: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      alertId: string;
    }
  ): Promise<Notification> {
    const priorityMap: Record<string, NotificationPriority> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'urgent',
    };

    return this.createNotification({
      userId,
      type: 'compliance_alert',
      category: 'compliance',
      priority: priorityMap[alertData.severity],
      title: alertData.title,
      message: alertData.message,
      actionUrl: '/compliance/alerts',
      actionLabel: 'View Alert',
      metadata: { alertId: alertData.alertId },
    });
  }

  /**
   * Create a certificate expiry notification
   */
  async notifyCertificateExpiry(
    userId: string,
    daysUntilExpiry: number,
    certificationType: string
  ): Promise<Notification> {
    const priority: NotificationPriority =
      daysUntilExpiry <= 7 ? 'urgent' : daysUntilExpiry <= 30 ? 'high' : 'medium';

    return this.createNotification({
      userId,
      type: 'certificate_expiry',
      category: 'certification',
      priority,
      title: 'Certificate Expiring Soon',
      message: `Your ${certificationType} will expire in ${daysUntilExpiry} days. Start the renewal process now to avoid interruption.`,
      actionUrl: '/certifications',
      actionLabel: 'Start Renewal',
      metadata: { daysUntilExpiry, certificationType },
    });
  }

  /**
   * Create a map update notification
   */
  async notifyMapUpdate(userId: string, updateDetails: string): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'map_update',
      category: 'general',
      priority: 'medium',
      title: 'HUBZone Map Updated',
      message: updateDetails,
      actionUrl: '/map',
      actionLabel: 'View Map',
    });
  }

  /**
   * Create a system announcement notification for all users
   */
  async createSystemAnnouncement(
    title: string,
    message: string,
    options?: {
      priority?: NotificationPriority;
      actionUrl?: string;
      expiresAt?: Date;
    }
  ): Promise<number> {
    // Get all active user IDs
    const users = await db.all<{ id: string }[]>('SELECT id FROM users WHERE active = 1');
    const userIds = users.map(u => u.id);

    return this.createBulkNotifications(userIds, {
      type: 'system_announcement',
      category: 'system',
      priority: options?.priority || 'low',
      title,
      message,
      actionUrl: options?.actionUrl,
      expiresAt: options?.expiresAt,
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default NotificationService;


/**
 * Email Preferences Service
 * Manage user email preferences and unsubscribe handling
 */

import { v4 as uuidv4 } from 'uuid';
import type { EmailPreferences, EmailCategory } from '../types/email.js';
import pool from './database.js';

class EmailPreferencesService {
  /**
   * Get user email preferences
   */
  async getPreferences(userId: string): Promise<EmailPreferences | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM email_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToPreferences(result.rows[0]);
    } catch (error) {
      console.error('Failed to get email preferences:', error);
      // Return default preferences if table doesn't exist yet
      return this.getDefaultPreferences(userId, '');
    }
  }

  /**
   * Get or create user email preferences
   */
  async getOrCreatePreferences(userId: string, email: string): Promise<EmailPreferences> {
    const existing = await this.getPreferences(userId);
    if (existing) {
      return existing;
    }

    return this.createPreferences(userId, email);
  }

  /**
   * Create default email preferences for a user
   */
  async createPreferences(userId: string, email: string): Promise<EmailPreferences> {
    const defaults = this.getDefaultPreferences(userId, email);

    try {
      await pool.query(
        `INSERT INTO email_preferences (
          user_id, email, transactional, compliance_alerts, compliance_alert_frequency,
          product_updates, feature_announcements, tips_and_best_practices,
          weekly_digest, weekly_digest_day, unsubscribed_all, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          email,
          defaults.transactional,
          defaults.complianceAlerts,
          defaults.complianceAlertFrequency,
          defaults.productUpdates,
          defaults.featureAnnouncements,
          defaults.tipsAndBestPractices,
          defaults.weeklyDigest,
          defaults.weeklyDigestDay,
          defaults.unsubscribedAll,
          defaults.createdAt,
          defaults.updatedAt,
        ]
      );
    } catch (error) {
      console.error('Failed to create email preferences:', error);
    }

    return defaults;
  }

  /**
   * Update user email preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<Omit<EmailPreferences, 'userId' | 'email' | 'createdAt' | 'updatedAt'>>
  ): Promise<EmailPreferences> {
    const current = await this.getOrCreatePreferences(userId, '');
    const updated = { ...current, ...updates, updatedAt: new Date() };

    try {
      await pool.query(
        `UPDATE email_preferences SET
          transactional = $2,
          compliance_alerts = $3,
          compliance_alert_frequency = $4,
          product_updates = $5,
          feature_announcements = $6,
          tips_and_best_practices = $7,
          weekly_digest = $8,
          weekly_digest_day = $9,
          unsubscribed_all = $10,
          unsubscribed_at = $11,
          updated_at = $12
        WHERE user_id = $1`,
        [
          userId,
          updated.transactional,
          updated.complianceAlerts,
          updated.complianceAlertFrequency,
          updated.productUpdates,
          updated.featureAnnouncements,
          updated.tipsAndBestPractices,
          updated.weeklyDigest,
          updated.weeklyDigestDay,
          updated.unsubscribedAll,
          updated.unsubscribedAt,
          updated.updatedAt,
        ]
      );
    } catch (error) {
      console.error('Failed to update email preferences:', error);
    }

    return updated;
  }

  /**
   * Check if user can receive emails of a specific category
   */
  async canReceiveEmail(userId: string, category: EmailCategory): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    if (!prefs) {
      // Default to allowing transactional and compliance emails
      return category === 'transactional' || category === 'compliance';
    }

    // Always allow transactional emails (except if fully unsubscribed)
    if (category === 'transactional') {
      return prefs.transactional && !prefs.unsubscribedAll;
    }

    // Check if globally unsubscribed
    if (prefs.unsubscribedAll) {
      return false;
    }

    switch (category) {
      case 'compliance':
        return prefs.complianceAlerts;
      case 'marketing':
        return prefs.productUpdates || prefs.featureAnnouncements || prefs.tipsAndBestPractices;
      case 'digest':
        return prefs.weeklyDigest;
      default:
        return true;
    }
  }

  /**
   * Unsubscribe from a specific category
   */
  async unsubscribeFromCategory(userId: string, category: EmailCategory): Promise<void> {
    const updates: Partial<EmailPreferences> = {};

    switch (category) {
      case 'compliance':
        updates.complianceAlerts = false;
        break;
      case 'marketing':
        updates.productUpdates = false;
        updates.featureAnnouncements = false;
        updates.tipsAndBestPractices = false;
        break;
      case 'digest':
        updates.weeklyDigest = false;
        break;
    }

    await this.updatePreferences(userId, updates);
  }

  /**
   * Unsubscribe from all non-transactional emails
   */
  async unsubscribeAll(userId: string): Promise<void> {
    await this.updatePreferences(userId, {
      complianceAlerts: false,
      productUpdates: false,
      featureAnnouncements: false,
      tipsAndBestPractices: false,
      weeklyDigest: false,
      unsubscribedAll: true,
      unsubscribedAt: new Date(),
    });
  }

  /**
   * Generate unsubscribe token
   */
  generateUnsubscribeToken(userId: string, category?: EmailCategory): string {
    // In production, use JWT or encrypted token
    const payload = {
      userId,
      category,
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Verify and decode unsubscribe token
   */
  verifyUnsubscribeToken(token: string): { userId: string; category?: EmailCategory } | null {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
      
      // Check token age (valid for 30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - payload.timestamp > maxAge) {
        return null;
      }

      return {
        userId: payload.userId,
        category: payload.category,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get unsubscribe URL for a user
   */
  getUnsubscribeUrl(userId: string, category?: EmailCategory): string {
    const token = this.generateUnsubscribeToken(userId, category);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  /**
   * Get users who want weekly digest
   */
  async getWeeklyDigestRecipients(dayOfWeek: string): Promise<Array<{ userId: string; email: string }>> {
    try {
      const result = await pool.query(
        `SELECT user_id, email FROM email_preferences
         WHERE weekly_digest = true
         AND weekly_digest_day = $1
         AND unsubscribed_all = false`,
        [dayOfWeek]
      );

      return result.rows.map((row) => ({
        userId: row.user_id,
        email: row.email,
      }));
    } catch (error) {
      console.error('Failed to get weekly digest recipients:', error);
      return [];
    }
  }

  /**
   * Get users subscribed to compliance alerts
   */
  async getComplianceAlertRecipients(): Promise<Array<{ userId: string; email: string; frequency: string }>> {
    try {
      const result = await pool.query(
        `SELECT user_id, email, compliance_alert_frequency FROM email_preferences
         WHERE compliance_alerts = true
         AND unsubscribed_all = false`
      );

      return result.rows.map((row) => ({
        userId: row.user_id,
        email: row.email,
        frequency: row.compliance_alert_frequency,
      }));
    } catch (error) {
      console.error('Failed to get compliance alert recipients:', error);
      return [];
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(userId: string, email: string): EmailPreferences {
    return {
      userId,
      email,
      transactional: true,
      complianceAlerts: true,
      complianceAlertFrequency: 'immediate',
      productUpdates: true,
      featureAnnouncements: true,
      tipsAndBestPractices: true,
      weeklyDigest: true,
      weeklyDigestDay: 'monday',
      unsubscribedAll: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map database row to EmailPreferences
   */
  private mapToPreferences(row: Record<string, unknown>): EmailPreferences {
    return {
      userId: row.user_id as string,
      email: row.email as string,
      transactional: row.transactional as boolean,
      complianceAlerts: row.compliance_alerts as boolean,
      complianceAlertFrequency: row.compliance_alert_frequency as EmailPreferences['complianceAlertFrequency'],
      productUpdates: row.product_updates as boolean,
      featureAnnouncements: row.feature_announcements as boolean,
      tipsAndBestPractices: row.tips_and_best_practices as boolean,
      weeklyDigest: row.weekly_digest as boolean,
      weeklyDigestDay: row.weekly_digest_day as EmailPreferences['weeklyDigestDay'],
      unsubscribedAll: row.unsubscribed_all as boolean,
      unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// Export singleton instance
export const emailPreferencesService = new EmailPreferencesService();

export default emailPreferencesService;


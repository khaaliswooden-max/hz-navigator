import { db } from './database.js';
import { complianceMonitoringService } from './complianceMonitoring.js';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type ComplianceAlert,
  type AlertSeverity,
  type AlertType,
  type AlertStatus,
  type CreateAlertInput,
  type AlertNotification,
  type NotificationPreferences,
  type NotificationChannel,
  type AlertDashboardSummary,
  type AlertFilterOptions,
  type AlertListResult,
  type AlertDetails,
  type EmailTemplateData,
  type EmailTemplateType,
} from '../types/alert.js';

import type { ComplianceStatus } from '../types/compliance.js';

/**
 * Compliance Alert Service
 * 
 * Manages generation, storage, and notification of compliance alerts
 */
export class AlertService {
  /**
   * Generate alerts for a business based on compliance status
   */
  async generateAlerts(businessId: string): Promise<ComplianceAlert[]> {
    // Get current compliance status
    const compliance = await complianceMonitoringService.calculateCompliance(businessId);
    
    const alerts: CreateAlertInput[] = [];

    // Check residency threshold
    const residencyAlert = this.checkResidencyThreshold(compliance);
    if (residencyAlert) alerts.push(residencyAlert);

    // Check principal office
    const officeAlert = this.checkPrincipalOffice(compliance);
    if (officeAlert) alerts.push(officeAlert);

    // Check certification expiration
    const certAlert = this.checkCertificationExpiration(compliance);
    if (certAlert) alerts.push(certAlert);

    // Check ownership compliance
    const ownershipAlert = this.checkOwnershipCompliance(compliance);
    if (ownershipAlert) alerts.push(ownershipAlert);

    // Store alerts and return
    const createdAlerts: ComplianceAlert[] = [];
    for (const alertInput of alerts) {
      // Check if similar alert already exists and is active
      const existingAlert = await this.findExistingAlert(
        businessId,
        alertInput.type,
        alertInput.severity
      );

      if (!existingAlert) {
        const created = await this.createAlert(alertInput);
        createdAlerts.push(created);
      }
    }

    return createdAlerts;
  }

  /**
   * Check residency threshold and generate appropriate alert
   */
  private checkResidencyThreshold(compliance: ComplianceStatus): CreateAlertInput | null {
    const { residency, businessId } = compliance;
    const percentage = residency.percentage;

    if (percentage < 35) {
      return {
        businessId,
        type: 'residency_threshold',
        severity: 'critical',
        title: 'CRITICAL: HUBZone Residency Below Required Threshold',
        message: `Your HUBZone employee residency is at ${percentage.toFixed(1)}%, which is below the required 35% threshold. Immediate action is required to maintain certification.`,
        details: {
          currentValue: percentage,
          threshold: 35,
          affectedEmployees: residency.shortfall,
          trend: compliance.riskAssessment.trend,
        },
        actionRequired: `Hire ${residency.shortfall} HUBZone resident employees immediately or verify current employee addresses.`,
        actionUrl: `/businesses/${businessId}/employees`,
      };
    }

    if (percentage >= 35 && percentage < 37) {
      return {
        businessId,
        type: 'residency_threshold',
        severity: 'high',
        title: 'HIGH RISK: HUBZone Residency Near Threshold',
        message: `Your HUBZone employee residency is at ${percentage.toFixed(1)}%, dangerously close to the 35% minimum. Any employee changes could put you out of compliance.`,
        details: {
          currentValue: percentage,
          threshold: 35,
          previousValue: undefined,
          trend: compliance.riskAssessment.trend,
        },
        actionRequired: 'Prioritize hiring HUBZone residents to increase your buffer above the threshold.',
        actionUrl: `/businesses/${businessId}/employees`,
      };
    }

    if (percentage >= 37 && percentage < 40) {
      return {
        businessId,
        type: 'residency_threshold',
        severity: 'medium',
        title: 'Advisory: Limited HUBZone Residency Buffer',
        message: `Your HUBZone employee residency is at ${percentage.toFixed(1)}%. While compliant, you have limited buffer above the 35% threshold.`,
        details: {
          currentValue: percentage,
          threshold: 35,
          trend: compliance.riskAssessment.trend,
        },
        actionRequired: 'Consider hiring more HUBZone residents to maintain a healthy compliance buffer.',
        actionUrl: `/businesses/${businessId}/employees`,
      };
    }

    return null;
  }

  /**
   * Check principal office and generate appropriate alert
   */
  private checkPrincipalOffice(compliance: ComplianceStatus): CreateAlertInput | null {
    const { principalOffice, businessId } = compliance;

    if (!principalOffice.isInHubzone) {
      return {
        businessId,
        type: 'principal_office',
        severity: 'critical',
        title: 'CRITICAL: Principal Office Not in HUBZone',
        message: 'Your principal office is not located in a qualified HUBZone area. This is a critical compliance violation.',
        details: {
          hubzoneName: principalOffice.hubzoneName ?? undefined,
        },
        actionRequired: 'Relocate your principal office to a qualified HUBZone area immediately.',
        actionUrl: `/businesses/${businessId}/locations`,
      };
    }

    if (principalOffice.isRedesignated && principalOffice.gracePeriodDaysRemaining !== null) {
      const daysRemaining = principalOffice.gracePeriodDaysRemaining;
      
      if (daysRemaining <= 180) {
        return {
          businessId,
          type: 'grace_period_expiring',
          severity: 'high',
          title: 'HIGH: HUBZone Grace Period Expiring',
          message: `Your principal office is in a redesignated HUBZone. The grace period expires in ${daysRemaining} days.`,
          details: {
            daysRemaining,
            hubzoneName: principalOffice.hubzoneName ?? undefined,
            gracePeriodEndDate: principalOffice.gracePeriodEndDate?.toISOString(),
          },
          actionRequired: 'Plan relocation of your principal office to an active HUBZone before the grace period ends.',
          actionUrl: `/businesses/${businessId}/locations`,
        };
      }
    }

    return null;
  }

  /**
   * Check certification expiration and generate appropriate alert
   */
  private checkCertificationExpiration(compliance: ComplianceStatus): CreateAlertInput | null {
    const { certification, businessId } = compliance;

    if (certification.isExpired) {
      return {
        businessId,
        type: 'certification_expiration',
        severity: 'critical',
        title: 'CRITICAL: HUBZone Certification Expired',
        message: 'Your HUBZone certification has expired. You cannot participate in HUBZone programs until recertified.',
        details: {},
        actionRequired: 'Submit recertification application immediately.',
        actionUrl: `/businesses/${businessId}/certification`,
      };
    }

    const daysRemaining = certification.daysUntilExpiration ?? 0;

    if (daysRemaining > 0 && daysRemaining <= 30) {
      return {
        businessId,
        type: 'certification_expiration',
        severity: 'critical',
        title: 'CRITICAL: Certification Expiring in 30 Days',
        message: `Your HUBZone certification expires in ${daysRemaining} days. Immediate action is required.`,
        details: {
          daysRemaining,
        },
        actionRequired: 'Submit recertification application now to ensure continuous certification.',
        actionUrl: `/businesses/${businessId}/certification`,
      };
    }

    if (daysRemaining > 30 && daysRemaining <= 90) {
      return {
        businessId,
        type: 'certification_expiration',
        severity: 'high',
        title: 'HIGH: Certification Expiring Soon',
        message: `Your HUBZone certification expires in ${daysRemaining} days. Begin the recertification process.`,
        details: {
          daysRemaining,
        },
        actionRequired: 'Start gathering documents for recertification application.',
        actionUrl: `/businesses/${businessId}/certification`,
      };
    }

    if (daysRemaining > 90 && daysRemaining <= 180) {
      return {
        businessId,
        type: 'certification_expiration',
        severity: 'medium',
        title: 'Advisory: Certification Renewal Approaching',
        message: `Your HUBZone certification expires in ${daysRemaining} days. Plan for recertification.`,
        details: {
          daysRemaining,
        },
        actionRequired: 'Review certification requirements and prepare for recertification.',
        actionUrl: `/businesses/${businessId}/certification`,
      };
    }

    return null;
  }

  /**
   * Check ownership compliance and generate appropriate alert
   */
  private checkOwnershipCompliance(compliance: ComplianceStatus): CreateAlertInput | null {
    const { ownership, businessId } = compliance;

    if (!ownership.isCompliant) {
      return {
        businessId,
        type: 'ownership_compliance',
        severity: 'critical',
        title: 'CRITICAL: Ownership Compliance Violation',
        message: `Qualified ownership is at ${ownership.ownershipPercentage}%, below the required ${ownership.requiredPercentage}%.`,
        details: {
          currentValue: ownership.ownershipPercentage,
          threshold: ownership.requiredPercentage,
        },
        actionRequired: 'Review and restructure ownership to meet HUBZone requirements.',
        actionUrl: `/businesses/${businessId}/ownership`,
      };
    }

    return null;
  }

  /**
   * Find existing active alert of same type
   */
  private async findExistingAlert(
    businessId: string,
    type: AlertType,
    severity: AlertSeverity
  ): Promise<ComplianceAlert | null> {
    const query = `
      SELECT * FROM compliance_alerts
      WHERE business_id = $1
        AND type = $2
        AND severity = $3
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;

    const result = await db.query<Record<string, unknown>>(query, [businessId, type, severity]);
    return result.rows[0] ? this.mapAlertRow(result.rows[0]) : null;
  }

  /**
   * Create a new alert in the database
   */
  private async createAlert(input: CreateAlertInput): Promise<ComplianceAlert> {
    const query = `
      INSERT INTO compliance_alerts (
        business_id, type, severity, status, title, message,
        details, action_required, action_url, expires_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const result = await db.query<Record<string, unknown>>(query, [
      input.businessId,
      input.type,
      input.severity,
      input.title,
      input.message,
      JSON.stringify(input.details),
      input.actionRequired,
      input.actionUrl ?? null,
      input.expiresAt ?? null,
    ]);

    const alert = this.mapAlertRow(result.rows[0]!);

    // Trigger notifications for new alert
    await this.queueNotifications(alert);

    return alert;
  }

  /**
   * Send notifications for an alert
   */
  async sendNotifications(alertId: string): Promise<AlertNotification[]> {
    // Get the alert
    const alert = await this.getAlertById(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    // Get notification recipients for the business
    const recipients = await this.getAlertRecipients(alert.businessId);
    const notifications: AlertNotification[] = [];

    for (const recipient of recipients) {
      const preferences = await this.getUserNotificationPreferences(recipient.userId);
      const channels = this.getChannelsForSeverity(alert.severity, preferences);

      for (const channel of channels) {
        const notification = await this.sendNotificationToChannel(
          alert,
          recipient,
          channel,
          preferences
        );
        if (notification) {
          notifications.push(notification);
        }
      }
    }

    return notifications;
  }

  /**
   * Queue notifications for processing
   */
  private async queueNotifications(alert: ComplianceAlert): Promise<void> {
    const recipients = await this.getAlertRecipients(alert.businessId);

    for (const recipient of recipients) {
      const preferences = await this.getUserNotificationPreferences(recipient.userId);
      const channels = this.getChannelsForSeverity(alert.severity, preferences);

      for (const channel of channels) {
        await db.query(
          `INSERT INTO alert_notifications (
            alert_id, channel, recipient_id, recipient_email, recipient_phone, 
            status, created_at
          ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
          [
            alert.id,
            channel,
            recipient.userId,
            recipient.email,
            recipient.phone,
          ]
        );
      }
    }

    // In production, this would trigger an async job processor
    // For now, we process immediately for critical/high alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await this.sendNotifications(alert.id);
    }
  }

  /**
   * Get channels for alert severity based on user preferences
   */
  private getChannelsForSeverity(
    severity: AlertSeverity,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    switch (severity) {
      case 'critical':
        return preferences.criticalAlerts.filter((ch) => this.isChannelEnabled(ch, preferences));
      case 'high':
        return preferences.highAlerts.filter((ch) => this.isChannelEnabled(ch, preferences));
      case 'medium':
        return preferences.mediumAlerts.filter((ch) => this.isChannelEnabled(ch, preferences));
      case 'low':
        return preferences.lowAlerts.filter((ch) => this.isChannelEnabled(ch, preferences));
      default:
        return ['dashboard'];
    }
  }

  /**
   * Check if a channel is enabled in preferences
   */
  private isChannelEnabled(
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): boolean {
    switch (channel) {
      case 'email':
        return preferences.emailEnabled;
      case 'sms':
        return preferences.smsEnabled;
      case 'dashboard':
        return preferences.dashboardEnabled;
      case 'push':
        return preferences.pushEnabled;
      default:
        return false;
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendNotificationToChannel(
    alert: ComplianceAlert,
    recipient: { userId: string; email: string; phone?: string; name: string },
    channel: NotificationChannel,
    _preferences: NotificationPreferences
  ): Promise<AlertNotification | null> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(alert, recipient);
          break;
        case 'sms':
          if (alert.severity === 'critical' && recipient.phone) {
            await this.sendSmsNotification(alert, recipient);
          }
          break;
        case 'dashboard':
          // Dashboard notifications are stored in DB and read directly
          break;
        case 'push':
          await this.sendPushNotification(alert, recipient);
          break;
      }

      // Update notification status
      const updateResult = await db.query<AlertNotification>(
        `UPDATE alert_notifications 
         SET status = 'sent', sent_at = NOW() 
         WHERE alert_id = $1 AND recipient_id = $2 AND channel = $3
         RETURNING *`,
        [alert.id, recipient.userId, channel]
      );

      return updateResult.rows[0] ?? null;
    } catch (error) {
      // Log failure and update status
      await db.query(
        `UPDATE alert_notifications 
         SET status = 'failed', failure_reason = $4 
         WHERE alert_id = $1 AND recipient_id = $2 AND channel = $3`,
        [alert.id, recipient.userId, channel, (error as Error).message]
      );
      return null;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    alert: ComplianceAlert,
    recipient: { email: string; name: string }
  ): Promise<void> {
    const templateType = this.getEmailTemplateType(alert.severity);
    const templateData: EmailTemplateData = {
      recipientName: recipient.name,
      businessName: alert.businessName,
      alertTitle: alert.title,
      alertMessage: alert.message,
      actionRequired: alert.actionRequired,
      actionUrl: alert.actionUrl,
      severity: alert.severity,
      details: alert.details,
      unsubscribeUrl: `/settings/notifications/unsubscribe`,
    };

    const html = this.renderEmailTemplate(templateType, templateData);
    const subject = this.getEmailSubject(alert);

    // In production, integrate with email service (SendGrid, SES, etc.)
    console.info(`[Email] Sending ${templateType} to ${recipient.email}: ${subject}`);
    console.info(`[Email] HTML content length: ${html.length}`);
    
    // Placeholder for actual email sending
    // await emailService.send({ to: recipient.email, subject, html });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(
    alert: ComplianceAlert,
    recipient: { phone?: string; name: string }
  ): Promise<void> {
    if (!recipient.phone) return;

    const message = `HUBZone Alert: ${alert.title}. ${alert.actionRequired} Login to view details.`;
    
    // In production, integrate with SMS service (Twilio, etc.)
    console.info(`[SMS] Sending to ${recipient.phone}: ${message.substring(0, 160)}`);
    
    // Placeholder for actual SMS sending
    // await smsService.send({ to: recipient.phone, message });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    alert: ComplianceAlert,
    recipient: { userId: string; name: string }
  ): Promise<void> {
    const payload = {
      title: alert.title,
      body: alert.message,
      icon: this.getAlertIcon(alert.severity),
      badge: '/badge.png',
      data: {
        alertId: alert.id,
        businessId: alert.businessId,
        severity: alert.severity,
        url: alert.actionUrl,
      },
    };

    // In production, integrate with push service (Firebase, OneSignal, etc.)
    console.info(`[Push] Sending to user ${recipient.userId}:`, payload.title);
    
    // Placeholder for actual push sending
    // await pushService.send(recipient.userId, payload);
  }

  /**
   * Get email template type based on severity
   */
  private getEmailTemplateType(severity: AlertSeverity): EmailTemplateType {
    switch (severity) {
      case 'critical':
        return 'critical_alert';
      case 'high':
        return 'high_alert';
      default:
        return 'medium_alert';
    }
  }

  /**
   * Get email subject line
   */
  private getEmailSubject(alert: ComplianceAlert): string {
    const prefix = alert.severity === 'critical' ? '🚨 URGENT: ' :
                   alert.severity === 'high' ? '⚠️ Important: ' : 'ℹ️ ';
    return `${prefix}${alert.title} - ${alert.businessName}`;
  }

  /**
   * Get alert icon for push notifications
   */
  private getAlertIcon(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '/icons/alert-critical.png';
      case 'high':
        return '/icons/alert-high.png';
      case 'medium':
        return '/icons/alert-medium.png';
      default:
        return '/icons/alert-low.png';
    }
  }

  /**
   * Render email template
   */
  private renderEmailTemplate(type: EmailTemplateType, data: EmailTemplateData): string {
    const templates: Record<EmailTemplateType, () => string> = {
      critical_alert: () => this.criticalAlertTemplate(data),
      high_alert: () => this.highAlertTemplate(data),
      medium_alert: () => this.mediumAlertTemplate(data),
      alert_digest: () => this.alertDigestTemplate(data),
    };

    return templates[type]();
  }

  /**
   * Critical alert email template
   */
  private criticalAlertTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Critical HUBZone Compliance Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #dc2626; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚨 IMMEDIATE ACTION REQUIRED</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
          Dear ${data.recipientName},
        </p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #991b1b; margin: 0 0 8px; font-size: 18px;">${data.alertTitle}</h2>
          <p style="color: #7f1d1d; margin: 0; font-size: 14px;">${data.alertMessage}</p>
        </div>
        
        <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 12px;">Action Required:</h3>
        <p style="color: #374151; font-size: 14px; margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          ${data.actionRequired}
        </p>
        
        ${data.actionUrl ? `
        <a href="${data.actionUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Take Action Now
        </a>
        ` : ''}
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This is an automated alert from HZ Navigator for ${data.businessName}.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
          <a href="${data.unsubscribeUrl}" style="color: #6b7280;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * High alert email template
   */
  private highAlertTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Important HUBZone Compliance Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #f59e0b; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Action Needed Soon</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
          Dear ${data.recipientName},
        </p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #92400e; margin: 0 0 8px; font-size: 18px;">${data.alertTitle}</h2>
          <p style="color: #78350f; margin: 0; font-size: 14px;">${data.alertMessage}</p>
        </div>
        
        <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 12px;">Recommended Action:</h3>
        <p style="color: #374151; font-size: 14px; margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          ${data.actionRequired}
        </p>
        
        ${data.actionUrl ? `
        <a href="${data.actionUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          View Details
        </a>
        ` : ''}
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This is an automated alert from HZ Navigator for ${data.businessName}.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
          <a href="${data.unsubscribeUrl}" style="color: #6b7280;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Medium alert email template
   */
  private mediumAlertTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HUBZone Compliance Advisory</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #3b82f6; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ℹ️ Advisory Notice</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
          Dear ${data.recipientName},
        </p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #1e40af; margin: 0 0 8px; font-size: 18px;">${data.alertTitle}</h2>
          <p style="color: #1e3a8a; margin: 0; font-size: 14px;">${data.alertMessage}</p>
        </div>
        
        <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 12px;">Suggested Action:</h3>
        <p style="color: #374151; font-size: 14px; margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          ${data.actionRequired}
        </p>
        
        ${data.actionUrl ? `
        <a href="${data.actionUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Learn More
        </a>
        ` : ''}
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This is an automated alert from HZ Navigator for ${data.businessName}.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
          <a href="${data.unsubscribeUrl}" style="color: #6b7280;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Alert digest email template
   */
  private alertDigestTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HUBZone Compliance Alert Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #1f2937; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📋 Alert Digest</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
          Dear ${data.recipientName},
        </p>
        <p style="color: #374151; font-size: 14px; margin: 0 0 24px;">
          Here's your compliance alert summary for ${data.businessName}.
        </p>
        
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="color: #1f2937; margin: 0 0 8px; font-size: 18px;">${data.alertTitle}</h2>
          <p style="color: #4b5563; margin: 0; font-size: 14px;">${data.alertMessage}</p>
        </div>
        
        <a href="/dashboard/alerts" style="display: inline-block; background-color: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          View All Alerts
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This is an automated digest from HZ Navigator.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
          <a href="${data.unsubscribeUrl}" style="color: #6b7280;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId: string): Promise<ComplianceAlert | null> {
    const query = `
      SELECT ca.*, b.name as business_name
      FROM compliance_alerts ca
      JOIN businesses b ON b.id = ca.business_id
      WHERE ca.id = $1
    `;

    const result = await db.query(query, [alertId]);
    return result.rows[0] ? this.mapAlertRow(result.rows[0]) : null;
  }

  /**
   * Get alerts for a business with filtering
   */
  async getBusinessAlerts(
    businessId: string,
    acknowledged?: boolean
  ): Promise<ComplianceAlert[]> {
    let query = `
      SELECT ca.*, b.name as business_name
      FROM compliance_alerts ca
      JOIN businesses b ON b.id = ca.business_id
      WHERE ca.business_id = $1
    `;

    const params: unknown[] = [businessId];

    if (acknowledged !== undefined) {
      if (acknowledged) {
        query += ` AND ca.status = 'acknowledged'`;
      } else {
        query += ` AND ca.status = 'active'`;
      }
    }

    query += ` ORDER BY 
      CASE ca.severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      ca.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows.map((row) => this.mapAlertRow(row));
  }

  /**
   * Get alerts with advanced filtering
   */
  async getAlerts(options: AlertFilterOptions): Promise<AlertListResult> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.businessId) {
      whereClause += ` AND ca.business_id = $${paramIndex++}`;
      params.push(options.businessId);
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      whereClause += ` AND ca.status = ANY($${paramIndex++})`;
      params.push(statuses);
    }

    if (options.severity) {
      const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
      whereClause += ` AND ca.severity = ANY($${paramIndex++})`;
      params.push(severities);
    }

    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      whereClause += ` AND ca.type = ANY($${paramIndex++})`;
      params.push(types);
    }

    if (options.acknowledged !== undefined) {
      if (options.acknowledged) {
        whereClause += ` AND ca.acknowledged_at IS NOT NULL`;
      } else {
        whereClause += ` AND ca.acknowledged_at IS NULL`;
      }
    }

    if (options.startDate) {
      whereClause += ` AND ca.created_at >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options.endDate) {
      whereClause += ` AND ca.created_at <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) FROM compliance_alerts ca ${whereClause}
    `;
    const countResult = await db.query<{ count: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Data query
    const dataQuery = `
      SELECT ca.*, b.name as business_name
      FROM compliance_alerts ca
      JOIN businesses b ON b.id = ca.business_id
      ${whereClause}
      ORDER BY 
        CASE ca.severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        ca.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataResult = await db.query(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows.map((row) => this.mapAlertRow(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<ComplianceAlert | null> {
    const query = `
      UPDATE compliance_alerts
      SET status = 'acknowledged',
          acknowledged_at = NOW(),
          acknowledged_by = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [alertId, userId]);
    
    if (result.rows[0]) {
      // Fetch with business name
      return this.getAlertById(alertId);
    }
    
    return null;
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<ComplianceAlert | null> {
    const query = `
      UPDATE compliance_alerts
      SET status = 'dismissed',
          dismissed_at = NOW(),
          dismissed_by = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [alertId, userId]);
    
    if (result.rows[0]) {
      return this.getAlertById(alertId);
    }
    
    return null;
  }

  /**
   * Resolve an alert (when compliance issue is fixed)
   */
  async resolveAlert(alertId: string): Promise<ComplianceAlert | null> {
    const query = `
      UPDATE compliance_alerts
      SET status = 'resolved',
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [alertId]);
    
    if (result.rows[0]) {
      return this.getAlertById(alertId);
    }
    
    return null;
  }

  /**
   * Get dashboard summary of alerts
   */
  async getDashboardSummary(userId?: string): Promise<AlertDashboardSummary> {
    // Get counts by status
    const statusQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) as total
      FROM compliance_alerts
      WHERE (expires_at IS NULL OR expires_at > NOW())
    `;
    const statusResult = await db.query<{
      active: string;
      acknowledged: string;
      dismissed: string;
      resolved: string;
      total: string;
    }>(statusQuery, []);

    // Get counts by severity
    const severityQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low
      FROM compliance_alerts
      WHERE status = 'active'
    `;
    const severityResult = await db.query<{
      critical: string;
      high: string;
      medium: string;
      low: string;
    }>(severityQuery, []);

    // Get counts by type
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM compliance_alerts
      WHERE status = 'active'
      GROUP BY type
    `;
    const typeResult = await db.query<{ type: AlertType; count: string }>(typeQuery, []);
    const byType: Record<AlertType, number> = {
      residency_threshold: 0,
      principal_office: 0,
      certification_expiration: 0,
      ownership_compliance: 0,
      employee_verification: 0,
      grace_period_expiring: 0,
    };
    typeResult.rows.forEach((row) => {
      byType[row.type] = parseInt(row.count, 10);
    });

    // Get recent alerts
    const recentQuery = `
      SELECT ca.*, b.name as business_name
      FROM compliance_alerts ca
      JOIN businesses b ON b.id = ca.business_id
      WHERE ca.status = 'active'
      ORDER BY ca.created_at DESC
      LIMIT 10
    `;
    const recentResult = await db.query(recentQuery, []);

    // Get critical businesses
    const criticalQuery = `
      SELECT 
        ca.business_id,
        b.name as business_name,
        COUNT(*) as alert_count,
        MAX(CASE ca.severity 
          WHEN 'critical' THEN 4 
          WHEN 'high' THEN 3 
          WHEN 'medium' THEN 2 
          ELSE 1 
        END) as max_severity
      FROM compliance_alerts ca
      JOIN businesses b ON b.id = ca.business_id
      WHERE ca.status = 'active'
        AND ca.severity IN ('critical', 'high')
      GROUP BY ca.business_id, b.name
      ORDER BY max_severity DESC, alert_count DESC
      LIMIT 5
    `;
    const criticalResult = await db.query<{
      business_id: string;
      business_name: string;
      alert_count: string;
      max_severity: string;
    }>(criticalQuery, []);

    const severityMap: Record<string, AlertSeverity> = {
      '4': 'critical',
      '3': 'high',
      '2': 'medium',
      '1': 'low',
    };

    return {
      totalAlerts: parseInt(statusResult.rows[0]?.total ?? '0', 10),
      byStatus: {
        active: parseInt(statusResult.rows[0]?.active ?? '0', 10),
        acknowledged: parseInt(statusResult.rows[0]?.acknowledged ?? '0', 10),
        dismissed: parseInt(statusResult.rows[0]?.dismissed ?? '0', 10),
        resolved: parseInt(statusResult.rows[0]?.resolved ?? '0', 10),
      },
      bySeverity: {
        critical: parseInt(severityResult.rows[0]?.critical ?? '0', 10),
        high: parseInt(severityResult.rows[0]?.high ?? '0', 10),
        medium: parseInt(severityResult.rows[0]?.medium ?? '0', 10),
        low: parseInt(severityResult.rows[0]?.low ?? '0', 10),
      },
      byType,
      recentAlerts: recentResult.rows.map((row) => this.mapAlertRow(row)),
      criticalBusinesses: criticalResult.rows.map((row) => ({
        businessId: row.business_id,
        businessName: row.business_name,
        alertCount: parseInt(row.alert_count, 10),
        highestSeverity: severityMap[row.max_severity] ?? 'low',
      })),
    };
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const query = `
      SELECT * FROM notification_preferences
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    
    if (result.rows[0]) {
      return this.mapPreferencesRow(result.rows[0]);
    }

    // Return defaults if no preferences set
    return {
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getUserNotificationPreferences(userId);
    const updated = { ...existing, ...preferences, userId };

    const query = `
      INSERT INTO notification_preferences (
        user_id, email_enabled, sms_enabled, dashboard_enabled, push_enabled,
        critical_alerts, high_alerts, medium_alerts, low_alerts,
        quiet_hours_start, quiet_hours_end, email_digest,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        email_enabled = $2,
        sms_enabled = $3,
        dashboard_enabled = $4,
        push_enabled = $5,
        critical_alerts = $6,
        high_alerts = $7,
        medium_alerts = $8,
        low_alerts = $9,
        quiet_hours_start = $10,
        quiet_hours_end = $11,
        email_digest = $12,
        updated_at = NOW()
      RETURNING *
    `;

    await db.query(query, [
      userId,
      updated.emailEnabled,
      updated.smsEnabled,
      updated.dashboardEnabled,
      updated.pushEnabled,
      updated.criticalAlerts,
      updated.highAlerts,
      updated.mediumAlerts,
      updated.lowAlerts,
      updated.quietHoursStart ?? null,
      updated.quietHoursEnd ?? null,
      updated.emailDigest,
    ]);

    return updated;
  }

  /**
   * Get alert recipients for a business
   */
  private async getAlertRecipients(
    businessId: string
  ): Promise<{ userId: string; email: string; phone?: string; name: string }[]> {
    const query = `
      SELECT 
        u.id as user_id,
        u.email,
        u.phone,
        CONCAT(u.first_name, ' ', u.last_name) as name
      FROM users u
      JOIN business_users bu ON bu.user_id = u.id
      WHERE bu.business_id = $1
        AND u.is_active = true
        AND bu.receive_alerts = true
    `;

    const result = await db.query<{
      user_id: string;
      email: string;
      phone?: string;
      name: string;
    }>(query, [businessId]);

    return result.rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      phone: row.phone,
      name: row.name,
    }));
  }

  /**
   * Map database row to ComplianceAlert
   */
  private mapAlertRow(row: Record<string, unknown>): ComplianceAlert {
    return {
      id: row['id'] as string,
      businessId: row['business_id'] as string,
      businessName: row['business_name'] as string ?? '',
      type: row['type'] as AlertType,
      severity: row['severity'] as AlertSeverity,
      status: row['status'] as AlertStatus,
      title: row['title'] as string,
      message: row['message'] as string,
      details: typeof row['details'] === 'string' 
        ? JSON.parse(row['details'] as string) 
        : (row['details'] as AlertDetails ?? {}),
      actionRequired: row['action_required'] as string,
      actionUrl: row['action_url'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
      acknowledgedAt: row['acknowledged_at'] ? new Date(row['acknowledged_at'] as string) : null,
      acknowledgedBy: row['acknowledged_by'] as string | null,
      dismissedAt: row['dismissed_at'] ? new Date(row['dismissed_at'] as string) : null,
      dismissedBy: row['dismissed_by'] as string | null,
      resolvedAt: row['resolved_at'] ? new Date(row['resolved_at'] as string) : null,
      expiresAt: row['expires_at'] ? new Date(row['expires_at'] as string) : null,
    };
  }

  /**
   * Map database row to NotificationPreferences
   */
  private mapPreferencesRow(row: Record<string, unknown>): NotificationPreferences {
    return {
      userId: row['user_id'] as string,
      emailEnabled: row['email_enabled'] as boolean,
      smsEnabled: row['sms_enabled'] as boolean,
      dashboardEnabled: row['dashboard_enabled'] as boolean,
      pushEnabled: row['push_enabled'] as boolean,
      criticalAlerts: row['critical_alerts'] as NotificationChannel[],
      highAlerts: row['high_alerts'] as NotificationChannel[],
      mediumAlerts: row['medium_alerts'] as NotificationChannel[],
      lowAlerts: row['low_alerts'] as NotificationChannel[],
      quietHoursStart: row['quiet_hours_start'] as string | undefined,
      quietHoursEnd: row['quiet_hours_end'] as string | undefined,
      emailDigest: row['email_digest'] as 'immediate' | 'daily' | 'weekly',
    };
  }
}

// Export singleton instance
export const alertService = new AlertService();


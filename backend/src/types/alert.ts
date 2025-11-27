/**
 * Compliance Alert Types
 */

/**
 * Alert severity levels
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Alert types based on compliance requirements
 */
export type AlertType =
  | 'residency_threshold'
  | 'principal_office'
  | 'certification_expiration'
  | 'ownership_compliance'
  | 'employee_verification'
  | 'grace_period_expiring';

/**
 * Alert status
 */
export type AlertStatus = 'active' | 'acknowledged' | 'dismissed' | 'resolved';

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'sms' | 'dashboard' | 'push';

/**
 * Compliance alert entity
 */
export interface ComplianceAlert {
  id: string;
  businessId: string;
  businessName: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  details: AlertDetails;
  actionRequired: string;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  dismissedAt: Date | null;
  dismissedBy: string | null;
  resolvedAt: Date | null;
  expiresAt: Date | null;
}

/**
 * Alert-specific details
 */
export interface AlertDetails {
  currentValue?: number;
  threshold?: number;
  daysRemaining?: number;
  affectedEmployees?: number;
  previousValue?: number;
  trend?: 'increasing' | 'stable' | 'declining';
  hubzoneName?: string;
  gracePeriodEndDate?: string;
  [key: string]: unknown;
}

/**
 * Alert creation input
 */
export interface CreateAlertInput {
  businessId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: AlertDetails;
  actionRequired: string;
  actionUrl?: string;
  expiresAt?: Date;
}

/**
 * Alert notification record
 */
export interface AlertNotification {
  id: string;
  alertId: string;
  channel: NotificationChannel;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt: Date | null;
  deliveredAt: Date | null;
  failureReason?: string;
  createdAt: Date;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  dashboardEnabled: boolean;
  pushEnabled: boolean;
  criticalAlerts: NotificationChannel[];
  highAlerts: NotificationChannel[];
  mediumAlerts: NotificationChannel[];
  lowAlerts: NotificationChannel[];
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  emailDigest: 'immediate' | 'daily' | 'weekly';
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  emailEnabled: true,
  smsEnabled: false,
  dashboardEnabled: true,
  pushEnabled: true,
  criticalAlerts: ['email', 'sms', 'dashboard', 'push'],
  highAlerts: ['email', 'dashboard', 'push'],
  mediumAlerts: ['dashboard', 'push'],
  lowAlerts: ['dashboard'],
  emailDigest: 'immediate',
};

/**
 * Alert summary for dashboard
 */
export interface AlertDashboardSummary {
  totalAlerts: number;
  byStatus: {
    active: number;
    acknowledged: number;
    dismissed: number;
    resolved: number;
  };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<AlertType, number>;
  recentAlerts: ComplianceAlert[];
  criticalBusinesses: {
    businessId: string;
    businessName: string;
    alertCount: number;
    highestSeverity: AlertSeverity;
  }[];
}

/**
 * Alert filter options
 */
export interface AlertFilterOptions {
  businessId?: string;
  status?: AlertStatus | AlertStatus[];
  severity?: AlertSeverity | AlertSeverity[];
  type?: AlertType | AlertType[];
  acknowledged?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Alert list result with pagination
 */
export interface AlertListResult {
  data: ComplianceAlert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Email template types
 */
export type EmailTemplateType = 'critical_alert' | 'high_alert' | 'medium_alert' | 'alert_digest';

/**
 * Email template data
 */
export interface EmailTemplateData {
  recipientName: string;
  businessName: string;
  alertTitle: string;
  alertMessage: string;
  actionRequired: string;
  actionUrl?: string;
  severity: AlertSeverity;
  details: AlertDetails;
  unsubscribeUrl: string;
}


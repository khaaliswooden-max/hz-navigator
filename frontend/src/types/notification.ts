/**
 * Notification types for the HZ Navigator platform
 */

export type NotificationType =
  | 'compliance_alert'      // Compliance-related alerts
  | 'application_update'    // Application status changes
  | 'map_update'           // HUBZone map updates
  | 'system_announcement'  // System-wide announcements
  | 'certificate_expiry'   // Certificate expiration warnings
  | 'employee_update'      // Employee-related updates
  | 'document_update'      // Document status changes
  | 'verification_result'  // Verification results
  | 'reminder'             // General reminders
  | 'info';                // General information

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
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
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
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;   // HH:mm format
}

export interface NotificationFilters {
  type?: NotificationType[];
  category?: NotificationCategory[];
  priority?: NotificationPriority[];
  read?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
}

// API response types
export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

// Helper functions
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    compliance_alert: 'shield-exclamation',
    application_update: 'document-text',
    map_update: 'map',
    system_announcement: 'speakerphone',
    certificate_expiry: 'clock',
    employee_update: 'users',
    document_update: 'document',
    verification_result: 'check-circle',
    reminder: 'bell',
    info: 'information-circle',
  };
  return icons[type] || 'bell';
}

export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    compliance_alert: 'amber',
    application_update: 'hubzone',
    map_update: 'purple',
    system_announcement: 'gray',
    certificate_expiry: 'red',
    employee_update: 'blue',
    document_update: 'gray',
    verification_result: 'verified',
    reminder: 'hubzone',
    info: 'hubzone',
  };
  return colors[type] || 'gray';
}

export function getPriorityLabel(priority: NotificationPriority): string {
  const labels: Record<NotificationPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority];
}

export function getCategoryLabel(category: NotificationCategory): string {
  const labels: Record<NotificationCategory, string> = {
    compliance: 'Compliance',
    business: 'Business',
    certification: 'Certification',
    system: 'System',
    general: 'General',
  };
  return labels[category];
}


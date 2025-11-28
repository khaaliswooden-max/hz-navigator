/**
 * Email Types
 * Type definitions for the email system
 */

export type EmailTemplate =
  | 'welcome'
  | 'verification'
  | 'password-reset'
  | 'compliance-alert'
  | 'weekly-digest'
  | 'certificate-expiration'
  | 'document-uploaded'
  | 'application-status'
  | 'product-update'
  | 'feature-announcement';

export type EmailCategory =
  | 'transactional'
  | 'compliance'
  | 'marketing'
  | 'digest';

export type EmailStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'complained';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailOptions {
  to: string | string[] | EmailAddress | EmailAddress[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  from?: EmailAddress;
  replyTo?: EmailAddress;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  category?: EmailCategory;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  unsubscribeUrl?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: EmailTemplate;
  category: EmailCategory;
  status: EmailStatus;
  messageId?: string;
  error?: string;
  attempts: number;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EmailPreferences {
  userId: string;
  email: string;
  
  // Transactional (always sent)
  transactional: boolean;
  
  // Compliance notifications
  complianceAlerts: boolean;
  complianceAlertFrequency: 'immediate' | 'daily' | 'weekly';
  
  // Marketing
  productUpdates: boolean;
  featureAnnouncements: boolean;
  tipsAndBestPractices: boolean;
  
  // Digest
  weeklyDigest: boolean;
  weeklyDigestDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  
  // Global settings
  unsubscribedAll: boolean;
  unsubscribedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailQueueJob {
  id: string;
  email: EmailOptions;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledAt?: Date;
  processAt?: Date;
}

export interface TemplateData {
  // Common fields
  recipientName?: string;
  recipientEmail?: string;
  companyName?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  currentYear?: number;
  
  // Verification email
  verificationUrl?: string;
  verificationToken?: string;
  
  // Password reset
  resetUrl?: string;
  resetToken?: string;
  expiresIn?: string;
  
  // Compliance alert
  businessName?: string;
  alertType?: string;
  alertSeverity?: 'low' | 'medium' | 'high' | 'critical';
  alertMessage?: string;
  actionRequired?: string;
  deadline?: string;
  dashboardUrl?: string;
  
  // Certificate expiration
  certificateType?: string;
  expirationDate?: string;
  daysUntilExpiration?: number;
  renewalUrl?: string;
  
  // Weekly digest
  periodStart?: string;
  periodEnd?: string;
  summary?: {
    totalBusinesses?: number;
    complianceScore?: number;
    alertsCount?: number;
    documentsProcessed?: number;
  };
  alerts?: Array<{
    type: string;
    message: string;
    severity: string;
    businessName?: string;
  }>;
  upcomingDeadlines?: Array<{
    title: string;
    date: string;
    businessName?: string;
  }>;
  
  // Document uploaded
  documentName?: string;
  documentType?: string;
  uploadedAt?: string;
  documentUrl?: string;
  
  // Application status
  applicationId?: string;
  applicationStatus?: string;
  statusMessage?: string;
  nextSteps?: string[];
  
  // Product update / Feature announcement
  updateTitle?: string;
  updateDescription?: string;
  features?: Array<{
    title: string;
    description: string;
  }>;
  ctaUrl?: string;
  ctaText?: string;
}

export interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  
  // SMTP settings
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  
  // SendGrid settings
  sendgrid?: {
    apiKey: string;
  };
  
  // AWS SES settings
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  
  // Default settings
  defaultFrom: EmailAddress;
  defaultReplyTo?: EmailAddress;
  
  // Queue settings
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  
  // Rate limiting
  rateLimit?: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
  };
  
  // Environment
  environment: 'development' | 'staging' | 'production';
  testMode?: boolean;
  testEmail?: string;
}


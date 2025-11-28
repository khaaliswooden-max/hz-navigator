/**
 * Email Configuration
 * Settings for email service, templates, and delivery
 */

import type { EmailConfig, EmailAddress } from '../types/email.js';

/**
 * Get email configuration from environment
 */
export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp') as EmailConfig['provider'];
  const environment = (process.env.NODE_ENV || 'development') as EmailConfig['environment'];

  return {
    provider,

    // SMTP Configuration (default for development - use Mailtrap)
    smtp: {
      host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },

    // SendGrid Configuration
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },

    // AWS SES Configuration
    ses: {
      region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },

    // Default From Address
    defaultFrom: {
      email: process.env.EMAIL_FROM || 'noreply@hznavigator.com',
      name: process.env.EMAIL_FROM_NAME || 'HZ Navigator',
    },

    // Default Reply-To Address
    defaultReplyTo: {
      email: process.env.EMAIL_REPLY_TO || 'support@hznavigator.com',
      name: process.env.EMAIL_REPLY_TO_NAME || 'HZ Navigator Support',
    },

    // Redis Configuration (for Bull queue)
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },

    // Rate Limiting
    rateLimit: {
      maxPerSecond: parseInt(process.env.EMAIL_RATE_LIMIT_SECOND || '10', 10),
      maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_MINUTE || '100', 10),
      maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR || '1000', 10),
    },

    environment,

    // Test Mode - redirect all emails to test address
    testMode: process.env.EMAIL_TEST_MODE === 'true' || environment === 'development',
    testEmail: process.env.EMAIL_TEST_ADDRESS,
  };
}

/**
 * Email template settings
 */
export const emailTemplateConfig = {
  // Template directory relative to dist/src
  templatesDir: '../templates/emails',

  // Company branding
  companyName: 'HZ Navigator',
  companyLogo: process.env.EMAIL_LOGO_URL || 'https://hznavigator.com/logo.png',
  supportEmail: process.env.EMAIL_SUPPORT || 'support@hznavigator.com',
  websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Social links
  socialLinks: {
    twitter: process.env.EMAIL_TWITTER_URL,
    linkedin: process.env.EMAIL_LINKEDIN_URL,
    facebook: process.env.EMAIL_FACEBOOK_URL,
  },

  // Footer text
  footerText: 'HUBZone Certification Made Simple',
  copyrightText: `© ${new Date().getFullYear()} HZ Navigator. All rights reserved.`,
};

/**
 * Email queue settings
 */
export const emailQueueConfig = {
  // Queue name
  queueName: 'email-queue',

  // Default job options
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },

  // Rate limiting
  limiter: {
    max: 10, // Max jobs per duration
    duration: 1000, // 1 second
  },

  // Concurrency
  concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5', 10),
};

/**
 * Email scheduling settings
 */
export const emailScheduleConfig = {
  // Weekly digest
  weeklyDigest: {
    enabled: process.env.EMAIL_DIGEST_ENABLED !== 'false',
    defaultDay: 'monday',
    cronExpression: '0 8 * * 1', // 8 AM every Monday
  },

  // Certificate expiration reminders
  expirationReminders: {
    enabled: process.env.EMAIL_EXPIRATION_REMINDERS !== 'false',
    days: [7, 30, 60], // Days before expiration to send reminder
    cronExpression: '0 9 * * *', // 9 AM every day
  },

  // Compliance alerts
  complianceAlerts: {
    batchInterval: 15 * 60 * 1000, // 15 minutes
    criticalImmediate: true, // Send critical alerts immediately
  },
};

/**
 * Validate email configuration
 */
export function validateEmailConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const config = getEmailConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check provider configuration
  switch (config.provider) {
    case 'sendgrid':
      if (!config.sendgrid?.apiKey) {
        errors.push('SENDGRID_API_KEY is required when using SendGrid provider');
      }
      break;
    case 'ses':
      if (!config.ses?.accessKeyId || !config.ses?.secretAccessKey) {
        errors.push('AWS credentials are required when using SES provider');
      }
      break;
    case 'smtp':
      if (!config.smtp?.host) {
        warnings.push('SMTP_HOST not configured, using default Mailtrap settings');
      }
      break;
  }

  // Check from address
  if (!config.defaultFrom.email) {
    errors.push('EMAIL_FROM is required');
  }

  // Production warnings
  if (config.environment === 'production') {
    if (config.testMode) {
      warnings.push('Email test mode is enabled in production');
    }
    if (config.provider === 'smtp' && config.smtp?.host?.includes('mailtrap')) {
      errors.push('Mailtrap should not be used in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default getEmailConfig;


/**
 * Email Service
 * Comprehensive email sending with templates, queue, and tracking
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import { convert } from 'html-to-text';
import juice from 'juice';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  EmailOptions,
  EmailResult,
  EmailTemplate,
  EmailCategory,
  EmailLog,
  EmailPreferences,
  TemplateData,
  EmailConfig,
  EmailAddress,
} from '../types/email.js';
import { config } from '../config/index.js';

// Initialize Handlebars helpers
Handlebars.registerHelper('formatDate', (date: string | Date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

Handlebars.registerHelper('formatDateTime', (date: string | Date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
});

Handlebars.registerHelper('ifEquals', function(this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('severityColor', (severity: string) => {
  const colors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return colors[severity] || '#6b7280';
});

Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

class EmailService {
  private transporter: Transporter | null = null;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private config: EmailConfig;
  private templatesDir: string;

  constructor() {
    this.config = this.loadConfig();
    this.templatesDir = path.join(__dirname, '../templates/emails');
    this.initializeTransporter();
    this.loadTemplates();
  }

  private loadConfig(): EmailConfig {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp') as EmailConfig['provider'];
    
    return {
      provider,
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
      },
      ses: {
        region: process.env.AWS_SES_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      defaultFrom: {
        email: process.env.EMAIL_FROM || 'noreply@hznavigator.com',
        name: process.env.EMAIL_FROM_NAME || 'HZ Navigator',
      },
      defaultReplyTo: {
        email: process.env.EMAIL_REPLY_TO || 'support@hznavigator.com',
        name: process.env.EMAIL_REPLY_TO_NAME || 'HZ Navigator Support',
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
      rateLimit: {
        maxPerSecond: parseInt(process.env.EMAIL_RATE_LIMIT_SECOND || '10', 10),
        maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_MINUTE || '100', 10),
        maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR || '1000', 10),
      },
      environment: (process.env.NODE_ENV || 'development') as EmailConfig['environment'],
      testMode: process.env.EMAIL_TEST_MODE === 'true',
      testEmail: process.env.EMAIL_TEST_ADDRESS,
    };
  }

  private async initializeTransporter(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'sendgrid':
          // SendGrid SMTP relay
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
              user: 'apikey',
              pass: this.config.sendgrid?.apiKey || '',
            },
          });
          break;

        case 'ses':
          // AWS SES SMTP
          this.transporter = nodemailer.createTransport({
            host: `email-smtp.${this.config.ses?.region}.amazonaws.com`,
            port: 587,
            auth: {
              user: this.config.ses?.accessKeyId || '',
              pass: this.config.ses?.secretAccessKey || '',
            },
          });
          break;

        case 'smtp':
        default:
          // Generic SMTP (including Mailtrap for testing)
          this.transporter = nodemailer.createTransport({
            host: this.config.smtp?.host,
            port: this.config.smtp?.port,
            secure: this.config.smtp?.secure,
            auth: {
              user: this.config.smtp?.auth.user,
              pass: this.config.smtp?.auth.pass,
            },
          });
          break;
      }

      // Verify connection in development
      if (this.config.environment === 'development' && this.transporter) {
        try {
          await this.transporter.verify();
          console.log('Email service connected successfully');
        } catch (error) {
          console.warn('Email service connection warning:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  private loadTemplates(): void {
    try {
      // Ensure templates directory exists
      if (!fs.existsSync(this.templatesDir)) {
        console.warn(`Email templates directory not found: ${this.templatesDir}`);
        return;
      }

      // Load layout template
      const layoutPath = path.join(this.templatesDir, 'layout.hbs');
      let layoutTemplate: Handlebars.TemplateDelegate | null = null;
      if (fs.existsSync(layoutPath)) {
        const layoutSource = fs.readFileSync(layoutPath, 'utf-8');
        layoutTemplate = Handlebars.compile(layoutSource);
      }

      // Register partials
      const partialsDir = path.join(this.templatesDir, 'partials');
      if (fs.existsSync(partialsDir)) {
        const partialFiles = fs.readdirSync(partialsDir);
        for (const file of partialFiles) {
          if (file.endsWith('.hbs')) {
            const partialName = path.basename(file, '.hbs');
            const partialSource = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
            Handlebars.registerPartial(partialName, partialSource);
          }
        }
      }

      // Load email templates
      const templateFiles = fs.readdirSync(this.templatesDir);
      for (const file of templateFiles) {
        if (file.endsWith('.hbs') && file !== 'layout.hbs') {
          const templateName = path.basename(file, '.hbs') as EmailTemplate;
          const templatePath = path.join(this.templatesDir, file);
          const templateSource = fs.readFileSync(templatePath, 'utf-8');
          
          // Compile template with layout
          const compiledContent = Handlebars.compile(templateSource);
          
          if (layoutTemplate) {
            this.templates.set(templateName, (data: TemplateData) => {
              const content = compiledContent(data);
              return layoutTemplate!({ ...data, content });
            });
          } else {
            this.templates.set(templateName, compiledContent);
          }
        }
      }

      console.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  }

  private formatEmailAddress(address: string | EmailAddress): string {
    if (typeof address === 'string') {
      return address;
    }
    return address.name ? `${address.name} <${address.email}>` : address.email;
  }

  private async renderTemplate(template: EmailTemplate, data: TemplateData): Promise<{ html: string; text: string }> {
    const templateFn = this.templates.get(template);
    
    if (!templateFn) {
      // Fallback to simple text if template not found
      console.warn(`Email template not found: ${template}`);
      return {
        html: `<p>${data.alertMessage || 'Email content unavailable'}</p>`,
        text: data.alertMessage || 'Email content unavailable',
      };
    }

    // Add common data
    const fullData: TemplateData = {
      ...data,
      companyName: 'HZ Navigator',
      supportEmail: 'support@hznavigator.com',
      currentYear: new Date().getFullYear(),
      preferencesUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications`,
    };

    // Render HTML
    let html = templateFn(fullData);
    
    // Inline CSS for email clients
    html = juice(html);

    // Generate plain text version
    const text = convert(html, {
      wordwrap: 80,
      selectors: [
        { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        { selector: 'img', format: 'skip' },
      ],
    });

    return { html, text };
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    const messageId = uuidv4();

    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // Render template
      const { html, text } = await this.renderTemplate(options.template, options.data as TemplateData);

      // Handle test mode - redirect all emails to test address
      let recipients = options.to;
      if (this.config.testMode && this.config.testEmail) {
        recipients = this.config.testEmail;
        console.log(`Test mode: Redirecting email to ${this.config.testEmail}`);
      }

      // Format recipients
      const toAddresses = Array.isArray(recipients)
        ? recipients.map(r => this.formatEmailAddress(r)).join(', ')
        : this.formatEmailAddress(recipients);

      // Build email
      const mailOptions = {
        from: this.formatEmailAddress(options.from || this.config.defaultFrom),
        to: toAddresses,
        subject: options.subject,
        html,
        text,
        replyTo: options.replyTo
          ? this.formatEmailAddress(options.replyTo)
          : this.config.defaultReplyTo
            ? this.formatEmailAddress(this.config.defaultReplyTo)
            : undefined,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        headers: {
          'X-Message-Id': messageId,
          'X-Email-Category': options.category || 'transactional',
        },
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Log success
      await this.logEmail({
        id: messageId,
        to: toAddresses,
        subject: options.subject,
        template: options.template,
        category: options.category || 'transactional',
        status: 'sent',
        messageId: info.messageId,
        attempts: 1,
        sentAt: new Date(),
        createdAt: new Date(),
        metadata: options.metadata,
      });

      console.log(`Email sent successfully: ${messageId} to ${toAddresses} (${Date.now() - startTime}ms)`);

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failure
      await this.logEmail({
        id: messageId,
        to: Array.isArray(options.to) ? options.to.join(', ') : String(options.to),
        subject: options.subject,
        template: options.template,
        category: options.category || 'transactional',
        status: 'failed',
        error: errorMessage,
        attempts: 1,
        createdAt: new Date(),
        metadata: options.metadata,
      });

      console.error(`Email send failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    user: { email: string; firstName?: string; lastName?: string },
    token: string
  ): Promise<EmailResult> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address - HZ Navigator',
      template: 'verification',
      category: 'transactional',
      priority: 'high',
      data: {
        recipientName: user.firstName || 'there',
        recipientEmail: user.email,
        verificationUrl,
        verificationToken: token,
        expiresIn: '24 hours',
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    user: { email: string; firstName?: string; lastName?: string },
    token: string
  ): Promise<EmailResult> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password - HZ Navigator',
      template: 'password-reset',
      category: 'transactional',
      priority: 'high',
      data: {
        recipientName: user.firstName || 'there',
        recipientEmail: user.email,
        resetUrl,
        resetToken: token,
        expiresIn: '1 hour',
      },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    user: { email: string; firstName?: string; lastName?: string }
  ): Promise<EmailResult> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to HZ Navigator!',
      template: 'welcome',
      category: 'transactional',
      data: {
        recipientName: user.firstName || 'there',
        recipientEmail: user.email,
        dashboardUrl,
      },
    });
  }

  /**
   * Send compliance alert email
   */
  async sendComplianceAlert(
    business: { id: string; name: string; ownerEmail: string; ownerName?: string },
    alert: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      actionRequired?: string;
      deadline?: Date;
    }
  ): Promise<EmailResult> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/compliance/alerts`;
    
    return this.sendEmail({
      to: business.ownerEmail,
      subject: `${alert.severity === 'critical' ? '🚨 ' : ''}Compliance Alert: ${alert.type} - ${business.name}`,
      template: 'compliance-alert',
      category: 'compliance',
      priority: alert.severity === 'critical' ? 'high' : 'normal',
      data: {
        recipientName: business.ownerName || 'Business Owner',
        businessName: business.name,
        alertType: alert.type,
        alertSeverity: alert.severity,
        alertMessage: alert.message,
        actionRequired: alert.actionRequired,
        deadline: alert.deadline?.toISOString(),
        dashboardUrl,
      },
    });
  }

  /**
   * Send certificate expiration notice
   */
  async sendCertificateExpirationEmail(
    user: { email: string; firstName?: string },
    business: { name: string },
    expirationDate: Date,
    daysUntilExpiration: number
  ): Promise<EmailResult> {
    const renewalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/certifications`;
    
    return this.sendEmail({
      to: user.email,
      subject: `HUBZone Certification Expiring Soon - ${business.name}`,
      template: 'certificate-expiration',
      category: 'compliance',
      priority: daysUntilExpiration <= 30 ? 'high' : 'normal',
      data: {
        recipientName: user.firstName || 'there',
        businessName: business.name,
        certificateType: 'HUBZone Certification',
        expirationDate: expirationDate.toISOString(),
        daysUntilExpiration,
        renewalUrl,
      },
    });
  }

  /**
   * Send weekly digest email
   */
  async sendWeeklyDigest(
    user: { email: string; firstName?: string },
    data: {
      periodStart: Date;
      periodEnd: Date;
      summary: {
        totalBusinesses: number;
        complianceScore: number;
        alertsCount: number;
        documentsProcessed: number;
      };
      alerts: Array<{
        type: string;
        message: string;
        severity: string;
        businessName?: string;
      }>;
      upcomingDeadlines: Array<{
        title: string;
        date: string;
        businessName?: string;
      }>;
    }
  ): Promise<EmailResult> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Your Weekly HZ Navigator Digest',
      template: 'weekly-digest',
      category: 'digest',
      data: {
        recipientName: user.firstName || 'there',
        periodStart: data.periodStart.toISOString(),
        periodEnd: data.periodEnd.toISOString(),
        summary: data.summary,
        alerts: data.alerts,
        upcomingDeadlines: data.upcomingDeadlines,
        dashboardUrl,
      },
    });
  }

  /**
   * Send document uploaded notification
   */
  async sendDocumentUploadedEmail(
    user: { email: string; firstName?: string },
    document: {
      name: string;
      type: string;
      businessName: string;
      uploadedAt: Date;
    }
  ): Promise<EmailResult> {
    const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents`;
    
    return this.sendEmail({
      to: user.email,
      subject: `Document Uploaded: ${document.name}`,
      template: 'document-uploaded',
      category: 'transactional',
      data: {
        recipientName: user.firstName || 'there',
        documentName: document.name,
        documentType: document.type,
        businessName: document.businessName,
        uploadedAt: document.uploadedAt.toISOString(),
        documentUrl,
      },
    });
  }

  /**
   * Send application status update
   */
  async sendApplicationStatusEmail(
    user: { email: string; firstName?: string },
    application: {
      id: string;
      businessName: string;
      status: string;
      statusMessage: string;
      nextSteps?: string[];
    }
  ): Promise<EmailResult> {
    const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/certifications`;
    
    return this.sendEmail({
      to: user.email,
      subject: `Application Status Update - ${application.businessName}`,
      template: 'application-status',
      category: 'transactional',
      data: {
        recipientName: user.firstName || 'there',
        businessName: application.businessName,
        applicationId: application.id,
        applicationStatus: application.status,
        statusMessage: application.statusMessage,
        nextSteps: application.nextSteps,
        dashboardUrl: applicationUrl,
      },
    });
  }

  /**
   * Send product update email
   */
  async sendProductUpdateEmail(
    users: Array<{ email: string; firstName?: string }>,
    update: {
      title: string;
      description: string;
      features: Array<{ title: string; description: string }>;
      ctaUrl?: string;
      ctaText?: string;
    }
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (const user of users) {
      const result = await this.sendEmail({
        to: user.email,
        subject: `${update.title} - HZ Navigator`,
        template: 'product-update',
        category: 'marketing',
        data: {
          recipientName: user.firstName || 'there',
          updateTitle: update.title,
          updateDescription: update.description,
          features: update.features,
          ctaUrl: update.ctaUrl,
          ctaText: update.ctaText,
        },
      });
      results.push(result);
    }
    
    return results;
  }

  /**
   * Log email to database
   */
  private async logEmail(log: EmailLog): Promise<void> {
    try {
      // In production, save to database
      // For now, just log to console in development
      if (this.config.environment === 'development') {
        console.log('Email log:', {
          id: log.id,
          to: log.to,
          subject: log.subject,
          template: log.template,
          status: log.status,
        });
      }
      
      // TODO: Save to database
      // await db.query(
      //   `INSERT INTO email_logs (id, to_address, subject, template, category, status, message_id, error, attempts, sent_at, created_at, metadata)
      //    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      //   [log.id, log.to, log.subject, log.template, log.category, log.status, log.messageId, log.error, log.attempts, log.sentAt, log.createdAt, JSON.stringify(log.metadata)]
      // );
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * Check if user has opted out of email category
   */
  async checkPreferences(userId: string, category: EmailCategory): Promise<boolean> {
    // TODO: Implement database lookup
    // For now, return true (allowed)
    return true;
  }

  /**
   * Get email statistics
   */
  async getStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    byTemplate: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    // TODO: Implement database query
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      byTemplate: {},
      byCategory: {},
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();

export default emailService;


/**
 * Email Digest Job
 * Scheduled job to send weekly digest emails
 */

import { emailService } from '../services/emailService.js';
import { emailPreferencesService } from '../services/emailPreferencesService.js';
import { emailQueueService } from '../services/emailQueueService.js';
import pool from '../services/database.js';

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DigestData {
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

/**
 * Get user's weekly digest data
 */
async function getUserDigestData(userId: string): Promise<DigestData> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Get user's businesses
    const businessResult = await pool.query(
      `SELECT COUNT(*) as total FROM businesses WHERE owner_id = $1`,
      [userId]
    );
    const totalBusinesses = parseInt(businessResult.rows[0]?.total || '0', 10);

    // Get average compliance score
    const complianceResult = await pool.query(
      `SELECT AVG(compliance_score) as avg_score FROM businesses WHERE owner_id = $1`,
      [userId]
    );
    const complianceScore = Math.round(parseFloat(complianceResult.rows[0]?.avg_score || '0'));

    // Get active alerts count
    const alertsResult = await pool.query(
      `SELECT COUNT(*) as total FROM alerts a
       JOIN businesses b ON a.business_id = b.id
       WHERE b.owner_id = $1 AND a.status = 'active'`,
      [userId]
    );
    const alertsCount = parseInt(alertsResult.rows[0]?.total || '0', 10);

    // Get documents processed this week
    const docsResult = await pool.query(
      `SELECT COUNT(*) as total FROM documents d
       JOIN businesses b ON d.business_id = b.id
       WHERE b.owner_id = $1 AND d.created_at >= $2`,
      [userId, periodStart]
    );
    const documentsProcessed = parseInt(docsResult.rows[0]?.total || '0', 10);

    // Get active alerts details
    const alertsDetailResult = await pool.query(
      `SELECT a.type, a.message, a.severity, b.name as business_name
       FROM alerts a
       JOIN businesses b ON a.business_id = b.id
       WHERE b.owner_id = $1 AND a.status = 'active'
       ORDER BY
         CASE a.severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           ELSE 4
         END
       LIMIT 5`,
      [userId]
    );

    const alerts = alertsDetailResult.rows.map((row) => ({
      type: row.type,
      message: row.message,
      severity: row.severity,
      businessName: row.business_name,
    }));

    // Get upcoming deadlines (certifications expiring in next 60 days)
    const deadlinesResult = await pool.query(
      `SELECT b.name as business_name, b.certification_expiration as date
       FROM businesses b
       WHERE b.owner_id = $1
         AND b.certification_expiration IS NOT NULL
         AND b.certification_expiration BETWEEN NOW() AND NOW() + INTERVAL '60 days'
       ORDER BY b.certification_expiration
       LIMIT 5`,
      [userId]
    );

    const upcomingDeadlines = deadlinesResult.rows.map((row) => ({
      title: 'HUBZone Certification Renewal',
      date: row.date,
      businessName: row.business_name,
    }));

    return {
      periodStart,
      periodEnd,
      summary: {
        totalBusinesses,
        complianceScore,
        alertsCount,
        documentsProcessed,
      },
      alerts,
      upcomingDeadlines,
    };
  } catch (error) {
    console.error('Error getting digest data for user:', userId, error);
    
    // Return empty data on error
    return {
      periodStart,
      periodEnd,
      summary: {
        totalBusinesses: 0,
        complianceScore: 0,
        alertsCount: 0,
        documentsProcessed: 0,
      },
      alerts: [],
      upcomingDeadlines: [],
    };
  }
}

/**
 * Send weekly digest emails
 */
export async function sendWeeklyDigests(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const today = DAYS_OF_WEEK[new Date().getDay()];
  console.log(`Running weekly digest job for ${today}`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get recipients for today's digest
    const recipients = await emailPreferencesService.getWeeklyDigestRecipients(today);
    console.log(`Found ${recipients.length} recipients for weekly digest`);

    for (const recipient of recipients) {
      try {
        // Get user's first name
        const userResult = await pool.query(
          `SELECT first_name, email FROM users WHERE id = $1`,
          [recipient.userId]
        );
        
        if (userResult.rows.length === 0) {
          skipped++;
          continue;
        }

        const user = userResult.rows[0];
        const digestData = await getUserDigestData(recipient.userId);

        // Skip if user has no businesses
        if (digestData.summary.totalBusinesses === 0) {
          skipped++;
          continue;
        }

        // Queue the email
        await emailQueueService.addToQueue({
          to: user.email,
          subject: 'Your Weekly HZ Navigator Digest',
          template: 'weekly-digest',
          category: 'digest',
          data: {
            recipientName: user.first_name || 'there',
            ...digestData,
          },
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send digest to user ${recipient.userId}:`, error);
        failed++;
      }
    }

    console.log(`Weekly digest job completed: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  } catch (error) {
    console.error('Weekly digest job failed:', error);
  }

  return { sent, failed, skipped };
}

/**
 * Send certificate expiration reminders
 */
export async function sendCertificateExpirationReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  console.log('Running certificate expiration reminder job');

  let sent = 0;
  let failed = 0;

  try {
    // Get businesses with certifications expiring in 7, 30, 60 days
    const result = await pool.query(
      `SELECT b.id, b.name, b.certification_expiration, u.id as user_id, u.email, u.first_name
       FROM businesses b
       JOIN users u ON b.owner_id = u.id
       WHERE b.certification_expiration IS NOT NULL
         AND b.certification_expiration::date IN (
           CURRENT_DATE + INTERVAL '7 days',
           CURRENT_DATE + INTERVAL '30 days',
           CURRENT_DATE + INTERVAL '60 days'
         )`
    );

    console.log(`Found ${result.rows.length} expiring certifications`);

    for (const row of result.rows) {
      try {
        // Check if user wants compliance alerts
        const canReceive = await emailPreferencesService.canReceiveEmail(row.user_id, 'compliance');
        
        if (!canReceive) {
          continue;
        }

        const expirationDate = new Date(row.certification_expiration);
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        await emailQueueService.addToQueue({
          to: row.email,
          subject: `HUBZone Certification Expiring Soon - ${row.name}`,
          template: 'certificate-expiration',
          category: 'compliance',
          priority: daysUntilExpiration <= 7 ? 'high' : 'normal',
          data: {
            recipientName: row.first_name || 'there',
            businessName: row.name,
            certificateType: 'HUBZone Certification',
            expirationDate: expirationDate.toISOString(),
            daysUntilExpiration,
            renewalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/certifications`,
          },
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send expiration reminder for business ${row.id}:`, error);
        failed++;
      }
    }

    console.log(`Certificate expiration job completed: ${sent} sent, ${failed} failed`);
  } catch (error) {
    console.error('Certificate expiration job failed:', error);
  }

  return { sent, failed };
}

export default {
  sendWeeklyDigests,
  sendCertificateExpirationReminders,
};


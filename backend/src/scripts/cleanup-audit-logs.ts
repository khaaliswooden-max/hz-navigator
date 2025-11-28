#!/usr/bin/env tsx
/**
 * Audit Log Cleanup Script
 * 
 * Cleans up audit logs older than the retention period.
 * Default retention: 365 days (1 year)
 * 
 * Usage:
 *   npm run audit:cleanup
 *   npm run audit:cleanup -- --days=180
 */

import dotenv from 'dotenv';
import { db } from '../services/database.js';

dotenv.config();

async function cleanupAuditLogs(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let retentionDays = 365;

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      const days = parseInt(arg.split('=')[1], 10);
      if (!isNaN(days) && days > 0) {
        retentionDays = days;
      }
    }
  }

  console.info('==========================================');
  console.info('  Audit Log Cleanup Script');
  console.info('==========================================');
  console.info('');
  console.info(`Retention period: ${retentionDays} days`);
  console.info(`Cutoff date: ${new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()}`);
  console.info('');

  try {
    // Count logs to be deleted
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`
    );
    const countToDelete = parseInt(countResult.rows[0].count, 10);

    console.info(`Logs to delete: ${countToDelete.toLocaleString()}`);

    if (countToDelete === 0) {
      console.info('No logs to delete. Exiting.');
      await db.close();
      return;
    }

    // Confirm deletion
    console.info('');
    console.info('Starting deletion...');

    // Delete in batches to avoid long-running transactions
    const batchSize = 10000;
    let totalDeleted = 0;

    while (totalDeleted < countToDelete) {
      const result = await db.query(
        `DELETE FROM audit_logs 
         WHERE id IN (
           SELECT id FROM audit_logs 
           WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
           LIMIT ${batchSize}
         )`
      );

      const deletedCount = result.rowCount ?? 0;
      totalDeleted += deletedCount;

      console.info(`  Deleted batch: ${deletedCount} (Total: ${totalDeleted.toLocaleString()}/${countToDelete.toLocaleString()})`);

      if (deletedCount === 0) break;
    }

    console.info('');
    console.info(`✅ Cleanup complete. Deleted ${totalDeleted.toLocaleString()} logs.`);

    // Log the cleanup action
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, metadata, created_at)
       VALUES ('ADMIN_SYSTEM_MODIFIED', 'system', $1, NOW())`,
      [JSON.stringify({
        operation: 'audit_log_cleanup',
        deleted_count: totalDeleted,
        retention_days: retentionDays,
        script: 'cleanup-audit-logs.ts',
      })]
    );

    // Also clean up failed login attempts
    const failedLoginsResult = await db.query(
      `DELETE FROM failed_login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days'`
    );
    console.info(`Cleaned up ${failedLoginsResult.rowCount ?? 0} old failed login attempts.`);

    // Clean up expired sessions
    const sessionsResult = await db.query(
      `DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '7 days'`
    );
    console.info(`Cleaned up ${sessionsResult.rowCount ?? 0} expired sessions.`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the cleanup
cleanupAuditLogs().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


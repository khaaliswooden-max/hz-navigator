/**
 * HUBZone Map Update Job
 *
 * Automated quarterly job to update HUBZone map data from Census and SBA sources.
 * Runs on the first day of each quarter (January, April, July, October) at midnight.
 *
 * Schedule: 0 0 1 1,4,7,10 * (midnight on first day of Q1, Q2, Q3, Q4)
 *
 * Features:
 * - Scheduled execution using node-cron
 * - Retry logic for failed downloads (3 attempts)
 * - Database execution tracking
 * - Admin notification on completion
 * - Error handling with data integrity
 */

import { CronJob } from 'cron';

import { db } from '../services/database.js';
import { HUBZoneMapLoaderService } from '../services/hubzoneMapLoader.js';
import { alertService } from '../services/alertService.js';

import type {
  JobDefinition,
  JobExecution,
  JobStatus,
  JobResult,
  MapUpdateJobResult,
  JobCompletionNotification,
  ManualJobTriggerRequest,
  ManualJobTriggerResponse,
  JobStatusResponse,
  JobExecutionSummary,
} from '../types/job.js';

import {
  QUARTERLY_CRON_EXPRESSION,
  DEFAULT_JOB_CONFIG,
  getNextQuarterlyRunDate,
  getCronDescription,
} from '../types/job.js';

/**
 * Map Update Job Configuration
 */
const MAP_UPDATE_JOB: JobDefinition = {
  id: 'hubzone-map-update',
  name: 'HUBZone Map Update',
  description: 'Quarterly update of HUBZone map data from Census TIGER/Line and SBA sources',
  cronExpression: QUARTERLY_CRON_EXPRESSION,
  enabled: true,
  maxRetries: DEFAULT_JOB_CONFIG.maxRetries,
  retryDelayMs: DEFAULT_JOB_CONFIG.retryDelayMs,
  timeoutMs: DEFAULT_JOB_CONFIG.timeoutMs,
  handler: executeMapUpdate,
};

/**
 * Map Update Job Manager
 *
 * Handles scheduling, execution, monitoring, and notifications for the
 * quarterly HUBZone map update job.
 */
export class MapUpdateJobManager {
  private cronJob: CronJob | null = null;
  private currentExecution: JobExecution | null = null;
  private isRunning: boolean = false;
  private adminEmails: string[] = [];

  constructor(adminEmails: string[] = []) {
    this.adminEmails = adminEmails;
  }

  /**
   * Start the scheduled job
   */
  start(): void {
    if (this.cronJob) {
      console.warn('[MapUpdateJob] Job already scheduled');
      return;
    }

    this.cronJob = new CronJob(
      MAP_UPDATE_JOB.cronExpression,
      async () => {
        await this.runScheduled();
      },
      null,
      true, // Start immediately
      'UTC'
    );

    console.info('[MapUpdateJob] Quarterly update job started');
    console.info(`[MapUpdateJob] Schedule: ${getCronDescription(MAP_UPDATE_JOB.cronExpression)}`);
    console.info(`[MapUpdateJob] Next run: ${getNextQuarterlyRunDate().toISOString()}`);
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.info('[MapUpdateJob] Quarterly update job stopped');
    }
  }

  /**
   * Run the job from scheduled trigger
   */
  private async runScheduled(): Promise<void> {
    await this.executeWithTracking('scheduled', null);
  }

  /**
   * Trigger manual job execution
   */
  async triggerManual(request: ManualJobTriggerRequest): Promise<ManualJobTriggerResponse> {
    if (this.isRunning) {
      throw new Error('Job is already running. Please wait for it to complete.');
    }

    const executionId = await this.executeWithTracking(
      'manual',
      request.triggeredBy ?? 'admin',
      request.options
    );

    return {
      executionId,
      jobId: MAP_UPDATE_JOB.id,
      jobName: MAP_UPDATE_JOB.name,
      status: 'running',
      startedAt: new Date(),
      message: 'Map update job started successfully',
    };
  }

  /**
   * Execute job with full tracking and retry logic
   */
  private async executeWithTracking(
    triggerType: 'scheduled' | 'manual',
    triggeredBy: string | null,
    options?: ManualJobTriggerRequest['options']
  ): Promise<string> {
    if (this.isRunning) {
      throw new Error('Job is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Create execution record
    const execution = await this.createExecutionRecord(triggerType, triggeredBy);
    this.currentExecution = execution;

    console.info(`[MapUpdateJob] Starting execution ${execution.id}`);
    console.info(`[MapUpdateJob] Trigger: ${triggerType}${triggeredBy ? ` by ${triggeredBy}` : ''}`);

    let result: MapUpdateJobResult | null = null;
    let lastError: Error | null = null;
    let retryCount = 0;

    // Retry loop
    while (retryCount <= MAP_UPDATE_JOB.maxRetries) {
      try {
        if (retryCount > 0) {
          console.info(`[MapUpdateJob] Retry attempt ${retryCount}/${MAP_UPDATE_JOB.maxRetries}`);
          await this.delay(MAP_UPDATE_JOB.retryDelayMs * retryCount);
        }

        // Execute the map update
        result = await this.executeMapUpdateWithOptions(options);

        if (result.success) {
          break; // Success, exit retry loop
        }

        // Partial failure - check if we should retry
        const fatalErrors = result.errors.filter((e) => e.code === 'IMPORT_FAILED');
        if (fatalErrors.length === 0 && result.statistics.newDesignations > 0) {
          // Partial success is acceptable
          console.warn('[MapUpdateJob] Completed with warnings, accepting partial success');
          break;
        }

        lastError = new Error(fatalErrors[0]?.message ?? 'Unknown error');
        retryCount++;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[MapUpdateJob] Attempt ${retryCount + 1} failed:`, lastError.message);
        retryCount++;
      }
    }

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Determine final status
    const finalStatus: JobStatus = result?.success ? 'completed' : 'failed';

    // Update execution record
    await this.updateExecutionRecord(execution.id, {
      status: finalStatus,
      completedAt: new Date(),
      durationMs,
      result: result as JobResult,
      errorMessage: lastError?.message ?? null,
      errorStack: lastError?.stack ?? null,
      retryCount,
    });

    // Log completion
    if (finalStatus === 'completed') {
      console.info(`[MapUpdateJob] Completed successfully in ${this.formatDuration(durationMs)}`);
      if (result) {
        console.info(`[MapUpdateJob] Statistics:`);
        console.info(`  - New designations: ${result.statistics.newDesignations}`);
        console.info(`  - Updated: ${result.statistics.updatedDesignations}`);
        console.info(`  - Expired: ${result.statistics.expiredDesignations}`);
        console.info(`  - Businesses notified: ${result.affectedBusinessCount}`);
      }
    } else {
      console.error(`[MapUpdateJob] Failed after ${retryCount} attempts: ${lastError?.message}`);
    }

    // Send admin notification
    await this.sendCompletionNotification(execution.id, finalStatus, result, lastError, durationMs);

    this.currentExecution = null;
    this.isRunning = false;

    return execution.id;
  }

  /**
   * Execute map update with options
   */
  private async executeMapUpdateWithOptions(
    options?: ManualJobTriggerRequest['options']
  ): Promise<MapUpdateJobResult> {
    const loader = new HUBZoneMapLoaderService({
      dryRun: options?.dryRun ?? false,
      enableNotifications: !(options?.skipNotifications ?? false),
    });

    // Set up progress logging
    loader.setProgressCallback((progress) => {
      if (progress.currentState) {
        console.info(
          `[MapUpdateJob] ${progress.stage}: ${progress.currentState} (${progress.percentComplete}%)`
        );
      }
    });

    const result = await loader.loadLatestHUBZoneMap();

    return {
      importId: result.importId,
      success: result.success,
      statistics: result.statistics,
      affectedBusinessCount: result.affectedBusinessCount,
      errors: result.errors.map((e) => ({
        code: e.code,
        message: e.message,
        geoid: e.geoid,
      })),
      warnings: result.warnings.map((w) => ({
        code: w.code,
        message: w.message,
        geoid: w.geoid,
      })),
    };
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(
    triggerType: 'scheduled' | 'manual',
    triggeredBy: string | null
  ): Promise<JobExecution> {
    const query = `
      INSERT INTO job_executions (
        id, job_id, job_name, status, started_at,
        trigger_type, triggered_by, retry_count, max_retries,
        metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'running', NOW(),
        $3, $4, 0, $5,
        '{}', NOW(), NOW()
      )
      RETURNING *
    `;

    const result = await db.query<Record<string, unknown>>(query, [
      MAP_UPDATE_JOB.id,
      MAP_UPDATE_JOB.name,
      triggerType,
      triggeredBy,
      MAP_UPDATE_JOB.maxRetries,
    ]);

    return this.mapExecutionRow(result.rows[0]!);
  }

  /**
   * Update execution record
   */
  private async updateExecutionRecord(
    executionId: string,
    updates: Partial<JobExecution>
  ): Promise<void> {
    const query = `
      UPDATE job_executions SET
        status = COALESCE($2, status),
        completed_at = COALESCE($3, completed_at),
        duration_ms = COALESCE($4, duration_ms),
        result = COALESCE($5, result),
        error_message = COALESCE($6, error_message),
        error_stack = COALESCE($7, error_stack),
        retry_count = COALESCE($8, retry_count),
        updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [
      executionId,
      updates.status ?? null,
      updates.completedAt ?? null,
      updates.durationMs ?? null,
      updates.result ? JSON.stringify(updates.result) : null,
      updates.errorMessage ?? null,
      updates.errorStack ?? null,
      updates.retryCount ?? null,
    ]);
  }

  /**
   * Send completion notification to admins
   */
  private async sendCompletionNotification(
    executionId: string,
    status: JobStatus,
    result: MapUpdateJobResult | null,
    error: Error | null,
    durationMs: number
  ): Promise<void> {
    if (this.adminEmails.length === 0) {
      console.info('[MapUpdateJob] No admin emails configured for notifications');
      return;
    }

    const notification: JobCompletionNotification = {
      jobId: MAP_UPDATE_JOB.id,
      jobName: MAP_UPDATE_JOB.name,
      executionId,
      status,
      startedAt: this.currentExecution?.startedAt ?? new Date(),
      completedAt: new Date(),
      durationMs,
      result: result as JobResult,
      errorMessage: error?.message ?? null,
      recipients: this.adminEmails,
    };

    // Log notification (in production, this would send actual emails)
    console.info('[MapUpdateJob] Admin notification:');
    console.info(`  Status: ${status}`);
    console.info(`  Duration: ${this.formatDuration(durationMs)}`);
    if (result) {
      console.info(`  Import ID: ${result.importId}`);
      console.info(`  Records processed: ${result.statistics.totalTracts}`);
    }
    if (error) {
      console.info(`  Error: ${error.message}`);
    }

    // Store notification in database for audit
    try {
      await db.query(
        `INSERT INTO job_notifications (
          execution_id, notification_type, recipients, sent_at, content
        ) VALUES ($1, 'completion', $2, NOW(), $3)`,
        [executionId, this.adminEmails, JSON.stringify(notification)]
      );
    } catch (err) {
      console.warn('[MapUpdateJob] Failed to store notification:', err);
    }

    // In production, integrate with email service
    // await emailService.sendJobCompletionNotification(notification);
  }

  /**
   * Get current job status
   */
  async getStatus(): Promise<JobStatusResponse> {
    // Get last execution
    const lastExecutionQuery = `
      SELECT * FROM job_executions
      WHERE job_id = $1
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const lastExecutionResult = await db.query<Record<string, unknown>>(lastExecutionQuery, [
      MAP_UPDATE_JOB.id,
    ]);

    const lastExecution =
      lastExecutionResult.rows.length > 0
        ? this.mapExecutionRow(lastExecutionResult.rows[0]!)
        : null;

    // Get execution history (last 10)
    const historyQuery = `
      SELECT 
        id, status, started_at, completed_at, duration_ms,
        trigger_type, triggered_by, error_message,
        CASE WHEN status = 'completed' THEN true ELSE false END as success
      FROM job_executions
      WHERE job_id = $1
      ORDER BY started_at DESC
      LIMIT 10
    `;

    const historyResult = await db.query<{
      id: string;
      status: JobStatus;
      started_at: Date;
      completed_at: Date | null;
      duration_ms: number | null;
      trigger_type: 'scheduled' | 'manual';
      triggered_by: string | null;
      error_message: string | null;
      success: boolean;
    }>(historyQuery, [MAP_UPDATE_JOB.id]);

    const executionHistory: JobExecutionSummary[] = historyResult.rows.map((row) => ({
      id: row.id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      triggerType: row.trigger_type,
      triggeredBy: row.triggered_by,
      success: row.success,
      errorMessage: row.error_message,
    }));

    return {
      jobId: MAP_UPDATE_JOB.id,
      jobName: MAP_UPDATE_JOB.name,
      description: MAP_UPDATE_JOB.description,
      enabled: MAP_UPDATE_JOB.enabled && this.cronJob !== null,
      cronExpression: MAP_UPDATE_JOB.cronExpression,
      cronDescription: getCronDescription(MAP_UPDATE_JOB.cronExpression),
      lastExecution,
      nextScheduledRun: this.cronJob ? getNextQuarterlyRunDate() : null,
      currentlyRunning: this.isRunning,
      executionHistory,
    };
  }

  /**
   * Get specific execution details
   */
  async getExecution(executionId: string): Promise<JobExecution | null> {
    const query = `SELECT * FROM job_executions WHERE id = $1`;
    const result = await db.query<Record<string, unknown>>(query, [executionId]);

    return result.rows.length > 0 ? this.mapExecutionRow(result.rows[0]!) : null;
  }

  /**
   * Map database row to JobExecution
   */
  private mapExecutionRow(row: Record<string, unknown>): JobExecution {
    return {
      id: row['id'] as string,
      jobId: row['job_id'] as string,
      jobName: row['job_name'] as string,
      status: row['status'] as JobStatus,
      startedAt: new Date(row['started_at'] as string),
      completedAt: row['completed_at'] ? new Date(row['completed_at'] as string) : null,
      durationMs: row['duration_ms'] as number | null,
      triggerType: row['trigger_type'] as 'scheduled' | 'manual',
      triggeredBy: row['triggered_by'] as string | null,
      result:
        typeof row['result'] === 'string'
          ? JSON.parse(row['result'])
          : (row['result'] as JobResult | null),
      errorMessage: row['error_message'] as string | null,
      errorStack: row['error_stack'] as string | null,
      retryCount: row['retry_count'] as number,
      maxRetries: row['max_retries'] as number,
      metadata:
        typeof row['metadata'] === 'string'
          ? JSON.parse(row['metadata'])
          : (row['metadata'] as Record<string, unknown>),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    if (minutes < 60) return `${minutes}m ${seconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if job is currently running
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current execution if running
   */
  getCurrentExecution(): JobExecution | null {
    return this.currentExecution;
  }
}

/**
 * Default job handler (used by scheduler)
 */
async function executeMapUpdate(): Promise<JobResult> {
  const loader = new HUBZoneMapLoaderService();
  const result = await loader.loadLatestHUBZoneMap();

  return {
    importId: result.importId,
    success: result.success,
    statistics: result.statistics,
    affectedBusinessCount: result.affectedBusinessCount,
    errors: result.errors,
    warnings: result.warnings,
  };
}

// Export singleton instance with default admin emails from environment
const adminEmails = process.env['ADMIN_EMAILS']?.split(',').map((e) => e.trim()) ?? [];
export const mapUpdateJobManager = new MapUpdateJobManager(adminEmails);


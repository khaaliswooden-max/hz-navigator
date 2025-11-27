import { complianceHistoryService } from './complianceHistoryService.js';

import type { NightlyJobResult } from '../types/compliance.js';

/**
 * Job schedule configuration
 */
interface ScheduleConfig {
  hour: number;
  minute: number;
  timezone: string;
}

/**
 * Scheduled job definition
 */
interface ScheduledJob {
  id: string;
  name: string;
  schedule: ScheduleConfig;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  handler: () => Promise<unknown>;
}

/**
 * Scheduler Service
 * 
 * Manages scheduled jobs including nightly compliance scans
 */
export class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor() {
    // Register default jobs
    this.registerDefaultJobs();
  }

  /**
   * Register default scheduled jobs
   */
  private registerDefaultJobs(): void {
    // Nightly compliance scan at 2:00 AM UTC
    this.registerJob({
      id: 'nightly-compliance-scan',
      name: 'Nightly Compliance Scan',
      schedule: {
        hour: 2,
        minute: 0,
        timezone: 'UTC',
      },
      enabled: true,
      lastRun: null,
      nextRun: null,
      handler: async () => this.runNightlyComplianceScan(),
    });

    // Weekly report generation at 6:00 AM UTC on Mondays
    this.registerJob({
      id: 'weekly-report-generation',
      name: 'Weekly Report Generation',
      schedule: {
        hour: 6,
        minute: 0,
        timezone: 'UTC',
      },
      enabled: true,
      lastRun: null,
      nextRun: null,
      handler: async () => this.runWeeklyReportGeneration(),
    });
  }

  /**
   * Register a new scheduled job
   */
  registerJob(job: ScheduledJob): void {
    job.nextRun = this.calculateNextRun(job.schedule);
    this.jobs.set(job.id, job);
    console.info(`[Scheduler] Registered job: ${job.name}`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Scheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.info('[Scheduler] Starting scheduler...');

    // Schedule all enabled jobs
    this.jobs.forEach((job) => {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    });

    console.info(`[Scheduler] Started with ${this.jobs.size} jobs`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear all timers
    this.timers.forEach((timer, jobId) => {
      clearTimeout(timer);
      console.info(`[Scheduler] Stopped job: ${jobId}`);
    });
    this.timers.clear();

    console.info('[Scheduler] Stopped');
  }

  /**
   * Schedule a job to run at its next scheduled time
   */
  private scheduleJob(job: ScheduledJob): void {
    const nextRun = this.calculateNextRun(job.schedule);
    const delay = nextRun.getTime() - Date.now();

    if (delay < 0) {
      console.warn(`[Scheduler] Next run time for ${job.name} is in the past, rescheduling...`);
      job.nextRun = this.calculateNextRun(job.schedule, new Date(Date.now() + 1000));
      this.scheduleJob(job);
      return;
    }

    job.nextRun = nextRun;

    const timer = setTimeout(async () => {
      await this.executeJob(job);
      
      // Reschedule for next day
      if (this.isRunning && job.enabled) {
        this.scheduleJob(job);
      }
    }, delay);

    this.timers.set(job.id, timer);
    
    console.info(`[Scheduler] ${job.name} scheduled for ${nextRun.toISOString()}`);
  }

  /**
   * Execute a job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    console.info(`[Scheduler] Starting job: ${job.name}`);
    const startTime = Date.now();

    try {
      await job.handler();
      job.lastRun = new Date();
      
      const duration = Date.now() - startTime;
      console.info(`[Scheduler] Completed ${job.name} in ${duration}ms`);
    } catch (error) {
      console.error(`[Scheduler] Error in ${job.name}:`, error);
      job.lastRun = new Date();
    }
  }

  /**
   * Calculate next run time for a schedule
   */
  private calculateNextRun(schedule: ScheduleConfig, after: Date = new Date()): Date {
    const next = new Date(after);
    next.setUTCHours(schedule.hour, schedule.minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (next <= after) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Run a job manually
   */
  async runJobNow(jobId: string): Promise<unknown> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    console.info(`[Scheduler] Manual run: ${job.name}`);
    return job.handler();
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs status
   */
  getAllJobsStatus(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.enabled = enabled;

    if (enabled && this.isRunning) {
      this.scheduleJob(job);
    } else if (!enabled) {
      const timer = this.timers.get(jobId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(jobId);
      }
    }

    console.info(`[Scheduler] ${job.name} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Run nightly compliance scan
   */
  private async runNightlyComplianceScan(): Promise<NightlyJobResult> {
    console.info('[NightlyJob] Starting compliance scan...');
    
    try {
      const result = await complianceHistoryService.runNightlyJob();
      
      console.info('[NightlyJob] Completed:');
      console.info(`  - Businesses processed: ${result.businessesProcessed}`);
      console.info(`  - Snapshots created: ${result.snapshotsCreated}`);
      console.info(`  - Alerts generated: ${result.alertsGenerated}`);
      console.info(`  - Errors: ${result.businessesFailed}`);
      
      return result;
    } catch (error) {
      console.error('[NightlyJob] Failed:', error);
      throw error;
    }
  }

  /**
   * Run weekly report generation
   */
  private async runWeeklyReportGeneration(): Promise<void> {
    console.info('[WeeklyReports] Starting report generation...');
    
    try {
      // Get all active businesses
      const { db } = await import('./database.js');
      const result = await db.query<{ id: string }>(
        'SELECT id FROM businesses WHERE is_active = true',
        []
      );

      let generated = 0;
      let failed = 0;

      for (const row of result.rows) {
        try {
          await complianceHistoryService.generateComplianceReport(
            row.id,
            'weekly',
            { generatedBy: 'scheduler' }
          );
          generated++;
        } catch (error) {
          console.error(`[WeeklyReports] Failed for business ${row.id}:`, error);
          failed++;
        }
      }

      console.info(`[WeeklyReports] Completed: ${generated} generated, ${failed} failed`);
    } catch (error) {
      console.error('[WeeklyReports] Failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();


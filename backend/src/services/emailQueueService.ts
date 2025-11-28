/**
 * Email Queue Service
 * Bull-based email queue with retry logic and tracking
 */

import Bull from 'bull';
import type { Job, Queue } from 'bull';
import type { EmailOptions, EmailResult, EmailQueueJob } from '../types/email.js';
import { emailService } from './emailService.js';

interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: number;
    removeOnFail: number;
  };
}

class EmailQueueService {
  private queue: Queue<EmailOptions> | null = null;
  private config: QueueConfig;
  private isInitialized = false;

  constructor() {
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds, then 25s, then 125s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      },
    };
  }

  /**
   * Initialize the queue
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.queue = new Bull<EmailOptions>('email-queue', {
        redis: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          maxRetriesPerRequest: 3,
        },
        defaultJobOptions: this.config.defaultJobOptions,
        limiter: {
          max: 10, // Max 10 jobs per second
          duration: 1000,
        },
      });

      // Process jobs
      this.queue.process(async (job: Job<EmailOptions>) => {
        console.log(`Processing email job ${job.id}: ${job.data.template} to ${job.data.to}`);
        
        const result = await emailService.sendEmail(job.data);
        
        if (!result.success) {
          throw new Error(result.error || 'Email send failed');
        }
        
        return result;
      });

      // Event handlers
      this.queue.on('completed', (job: Job<EmailOptions>, result: EmailResult) => {
        console.log(`Email job ${job.id} completed: ${result.messageId}`);
      });

      this.queue.on('failed', (job: Job<EmailOptions>, err: Error) => {
        console.error(`Email job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`, err.message);
        
        // Log critical failures
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          this.handlePermanentFailure(job, err);
        }
      });

      this.queue.on('stalled', (job: Job<EmailOptions>) => {
        console.warn(`Email job ${job.id} stalled`);
      });

      this.queue.on('error', (err: Error) => {
        console.error('Email queue error:', err);
      });

      this.isInitialized = true;
      console.log('Email queue service initialized');
    } catch (error) {
      console.error('Failed to initialize email queue:', error);
      // Continue without queue - emails will be sent directly
    }
  }

  /**
   * Add email to queue
   */
  async addToQueue(options: EmailOptions, jobOptions?: Partial<Bull.JobOptions>): Promise<string | null> {
    if (!this.queue) {
      // Fallback to direct send if queue not available
      console.warn('Email queue not available, sending directly');
      await emailService.sendEmail(options);
      return null;
    }

    const job = await this.queue.add(options, {
      ...jobOptions,
      priority: this.getPriority(options.priority),
      delay: options.scheduledAt
        ? new Date(options.scheduledAt).getTime() - Date.now()
        : 0,
    });

    console.log(`Email queued: ${job.id} - ${options.template} to ${options.to}`);
    return job.id.toString();
  }

  /**
   * Add multiple emails to queue (bulk)
   */
  async addBulkToQueue(emails: EmailOptions[]): Promise<string[]> {
    if (!this.queue) {
      console.warn('Email queue not available, sending directly');
      for (const email of emails) {
        await emailService.sendEmail(email);
      }
      return [];
    }

    const jobs = await this.queue.addBulk(
      emails.map((email) => ({
        data: email,
        opts: {
          priority: this.getPriority(email.priority),
        },
      }))
    );

    return jobs.map((job) => job.id.toString());
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    attempts: number;
    result?: EmailResult;
    error?: string;
  } | null> {
    if (!this.queue) return null;

    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const result = job.returnvalue as EmailResult | undefined;

    return {
      id: job.id.toString(),
      status: state,
      progress: job.progress() as number,
      attempts: job.attemptsMade,
      result,
      error: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    if (!this.queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.getPausedCount(),
    ]);

    return { waiting, active, completed, failed, delayed, paused };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(start = 0, end = 10): Promise<Array<{
    id: string;
    data: EmailOptions;
    error: string;
    attempts: number;
    failedAt: Date;
  }>> {
    if (!this.queue) return [];

    const jobs = await this.queue.getFailed(start, end);
    
    return jobs.map((job) => ({
      id: job.id.toString(),
      data: job.data,
      error: job.failedReason || 'Unknown error',
      attempts: job.attemptsMade,
      failedAt: new Date(job.finishedOn || Date.now()),
    }));
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;

    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    await job.retry();
    return true;
  }

  /**
   * Retry all failed jobs
   */
  async retryAllFailed(): Promise<number> {
    if (!this.queue) return 0;

    const failedJobs = await this.queue.getFailed();
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    return retried;
  }

  /**
   * Remove job
   */
  async removeJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;

    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    return true;
  }

  /**
   * Pause queue
   */
  async pause(): Promise<void> {
    if (this.queue) {
      await this.queue.pause();
      console.log('Email queue paused');
    }
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    if (this.queue) {
      await this.queue.resume();
      console.log('Email queue resumed');
    }
  }

  /**
   * Clean old jobs
   */
  async clean(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.queue) return;

    await Promise.all([
      this.queue.clean(grace, 'completed'),
      this.queue.clean(grace * 7, 'failed'), // Keep failed jobs longer
    ]);
    
    console.log('Email queue cleaned');
  }

  /**
   * Shutdown queue gracefully
   */
  async shutdown(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.isInitialized = false;
      console.log('Email queue service shut down');
    }
  }

  /**
   * Convert priority to number
   */
  private getPriority(priority?: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'low': return 10;
      default: return 5;
    }
  }

  /**
   * Handle permanent email failure
   */
  private async handlePermanentFailure(job: Job<EmailOptions>, error: Error): Promise<void> {
    // Log to monitoring/alerting system
    console.error(`Permanent email failure for job ${job.id}:`, {
      template: job.data.template,
      to: job.data.to,
      subject: job.data.subject,
      error: error.message,
      attempts: job.attemptsMade,
    });

    // TODO: Send alert to admin
    // TODO: Store in dead letter queue for manual review
    // TODO: Update email log status to 'permanently_failed'
  }
}

// Export singleton instance
export const emailQueueService = new EmailQueueService();

export default emailQueueService;


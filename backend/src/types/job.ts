/**
 * Job Execution Types
 * Types for scheduled job tracking, monitoring, and execution
 */

/**
 * Job status values
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Job execution record stored in database
 */
export interface JobExecution {
  id: string;
  jobId: string;
  jobName: string;
  status: JobStatus;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  triggerType: 'scheduled' | 'manual';
  triggeredBy: string | null;
  result: JobResult | null;
  errorMessage: string | null;
  errorStack: string | null;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job result for map update jobs
 */
export interface MapUpdateJobResult {
  importId: string;
  success: boolean;
  statistics: {
    totalTracts: number;
    newDesignations: number;
    updatedDesignations: number;
    expiredDesignations: number;
    redesignatedAreas: number;
    activeHubzones: number;
    processingTimeMs: number;
  };
  affectedBusinessCount: number;
  errors: Array<{
    code: string;
    message: string;
    geoid?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    geoid?: string;
  }>;
}

/**
 * Generic job result
 */
export type JobResult = MapUpdateJobResult | Record<string, unknown>;

/**
 * Job definition
 */
export interface JobDefinition {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  handler: () => Promise<JobResult>;
}

/**
 * Job status response for API
 */
export interface JobStatusResponse {
  jobId: string;
  jobName: string;
  description: string;
  enabled: boolean;
  cronExpression: string;
  cronDescription: string;
  lastExecution: JobExecution | null;
  nextScheduledRun: Date | null;
  currentlyRunning: boolean;
  executionHistory: JobExecutionSummary[];
}

/**
 * Job execution summary (for history lists)
 */
export interface JobExecutionSummary {
  id: string;
  status: JobStatus;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  triggerType: 'scheduled' | 'manual';
  triggeredBy: string | null;
  success: boolean;
  errorMessage: string | null;
}

/**
 * Manual job trigger request
 */
export interface ManualJobTriggerRequest {
  jobId: string;
  triggeredBy?: string;
  options?: {
    dryRun?: boolean;
    skipNotifications?: boolean;
    states?: string[];
  };
}

/**
 * Manual job trigger response
 */
export interface ManualJobTriggerResponse {
  executionId: string;
  jobId: string;
  jobName: string;
  status: JobStatus;
  startedAt: Date;
  message: string;
}

/**
 * Admin notification for job completion
 */
export interface JobCompletionNotification {
  jobId: string;
  jobName: string;
  executionId: string;
  status: JobStatus;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  result: JobResult | null;
  errorMessage: string | null;
  recipients: string[];
}

/**
 * Quarterly schedule dates
 */
export const QUARTERLY_SCHEDULE = {
  Q1: { month: 1, day: 1 },   // January 1
  Q2: { month: 4, day: 1 },   // April 1
  Q3: { month: 7, day: 1 },   // July 1
  Q4: { month: 10, day: 1 },  // October 1
} as const;

/**
 * Cron expression for quarterly schedule (midnight on first day of Q1, Q2, Q3, Q4)
 */
export const QUARTERLY_CRON_EXPRESSION = '0 0 1 1,4,7,10 *';

/**
 * Default job configuration
 */
export const DEFAULT_JOB_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 60000,      // 1 minute
  timeoutMs: 7200000,       // 2 hours
} as const;

/**
 * Calculate next quarterly run date
 */
export function getNextQuarterlyRunDate(after: Date = new Date()): Date {
  const quarters = [
    QUARTERLY_SCHEDULE.Q1,
    QUARTERLY_SCHEDULE.Q2,
    QUARTERLY_SCHEDULE.Q3,
    QUARTERLY_SCHEDULE.Q4,
  ];

  const currentYear = after.getFullYear();
  const currentMonth = after.getMonth() + 1; // 1-indexed
  const currentDay = after.getDate();

  // Find next quarter start
  for (const quarter of quarters) {
    if (
      quarter.month > currentMonth ||
      (quarter.month === currentMonth && quarter.day > currentDay)
    ) {
      return new Date(currentYear, quarter.month - 1, quarter.day, 0, 0, 0, 0);
    }
  }

  // Next quarter is Q1 of next year
  return new Date(currentYear + 1, 0, 1, 0, 0, 0, 0);
}

/**
 * Get human-readable cron description
 */
export function getCronDescription(expression: string): string {
  if (expression === QUARTERLY_CRON_EXPRESSION) {
    return 'Quarterly at midnight on January 1, April 1, July 1, and October 1';
  }

  // Basic cron parsing for common patterns
  const parts = expression.split(' ');
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '0' && hour === '0' && dayOfMonth === '1') {
    if (month === '*' && dayOfWeek === '*') {
      return 'Monthly at midnight on the 1st';
    }
    if (month === '1,4,7,10' && dayOfWeek === '*') {
      return 'Quarterly at midnight on January 1, April 1, July 1, and October 1';
    }
  }

  return expression;
}


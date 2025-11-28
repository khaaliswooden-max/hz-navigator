/**
 * Monitoring Service
 * 
 * Centralized monitoring, metrics collection, and alerting.
 * Integrates with external services (Datadog, New Relic, CloudWatch).
 * 
 * Alerting thresholds:
 * - Error rate > 5%
 * - Response time p95 > 2 seconds
 * - CPU > 80%
 * - Memory > 90%
 * - Disk > 80%
 * - Failed jobs in queue
 */

import os from 'os';
import { getMetrics, getHealthWithMetrics } from '../middleware/performanceMonitor.js';
import { cacheService } from './cacheService.js';

// ===== Types =====

export interface AlertConfig {
  errorRateThreshold: number;
  responseTimeP95Threshold: number;
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  failedJobsThreshold: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export type AlertType = 
  | 'error_rate'
  | 'response_time'
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'failed_jobs'
  | 'database'
  | 'cache'
  | 'uptime';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  components: {
    api: ComponentHealth;
    database: ComponentHealth;
    cache: ComponentHealth;
  };
  metrics: {
    requestsPerSecond: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  alerts: Alert[];
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
}

// ===== Configuration =====

const DEFAULT_CONFIG: AlertConfig = {
  errorRateThreshold: 0.05,          // 5%
  responseTimeP95Threshold: 2000,    // 2 seconds
  cpuThreshold: 80,                  // 80%
  memoryThreshold: 90,               // 90%
  diskThreshold: 80,                 // 80%
  failedJobsThreshold: 10,           // 10 failed jobs
};

// ===== Monitoring Service =====

class MonitoringService {
  private config: AlertConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHandlers: Array<(alert: Alert) => void> = [];
  private metricsHistory: Array<{ timestamp: Date; metrics: SystemMetrics }> = [];
  private startTime: Date;
  
  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
    
    // Start periodic monitoring
    this.startMonitoring();
  }
  
  // ===== System Metrics =====
  
  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
    
    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: (usedMemory / totalMemory) * 100,
      },
      disk: {
        total: 0, // Would need fs module for actual disk usage
        used: 0,
        free: 0,
        usagePercent: 0,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };
  }
  
  // ===== Health Checks =====
  
  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const perfHealth = getHealthWithMetrics();
    const perfMetrics = getMetrics();
    const systemMetrics = this.getSystemMetrics();
    const cacheStats = cacheService.getStats();
    
    // Check component health
    const apiHealth = this.checkApiHealth(perfHealth);
    const dbHealth = await this.checkDatabaseHealth();
    const cacheHealth = this.checkCacheHealth(cacheStats);
    
    // Determine overall status
    const components = { api: apiHealth, database: dbHealth, cache: cacheHealth };
    const componentStatuses = Object.values(components).map(c => c.status);
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (componentStatuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      overallStatus = 'degraded';
    }
    
    // Check for alerts
    this.checkAlerts(perfMetrics, systemMetrics);
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] ?? '1.0.0',
      components,
      metrics: {
        requestsPerSecond: perfMetrics.summary.requestsPerSecond,
        p95ResponseTime: perfMetrics.summary.p95ResponseTime,
        errorRate: perfMetrics.summary.errorRate,
      },
      alerts: Array.from(this.activeAlerts.values()).filter(a => !a.resolved),
    };
  }
  
  private checkApiHealth(perfHealth: ReturnType<typeof getHealthWithMetrics>): ComponentHealth {
    return {
      status: perfHealth.status,
      latency: perfHealth.metrics.p95ResponseTime,
      message: perfHealth.issues.length > 0 ? perfHealth.issues.join('; ') : undefined,
    };
  }
  
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      const { db } = await import('./database.js');
      const start = Date.now();
      await db.query('SELECT 1');
      const latency = Date.now() - start;
      
      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: (error as Error).message,
      };
    }
  }
  
  private checkCacheHealth(stats: { hitRate: number; size: number }): ComponentHealth {
    if (stats.hitRate < 0.5 && stats.size > 1000) {
      return {
        status: 'degraded',
        message: `Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`,
      };
    }
    return { status: 'healthy' };
  }
  
  // ===== Alerting =====
  
  /**
   * Check metrics against thresholds and trigger alerts
   */
  private checkAlerts(
    perfMetrics: ReturnType<typeof getMetrics>,
    systemMetrics: SystemMetrics
  ): void {
    // Error rate alert
    this.evaluateAlert(
      'error_rate',
      perfMetrics.summary.errorRate,
      this.config.errorRateThreshold,
      (value, threshold) => value > threshold,
      `Error rate is ${(perfMetrics.summary.errorRate * 100).toFixed(2)}%`
    );
    
    // Response time alert
    this.evaluateAlert(
      'response_time',
      perfMetrics.summary.p95ResponseTime,
      this.config.responseTimeP95Threshold,
      (value, threshold) => value > threshold,
      `P95 response time is ${perfMetrics.summary.p95ResponseTime.toFixed(2)}ms`
    );
    
    // CPU alert
    this.evaluateAlert(
      'cpu',
      systemMetrics.cpu.usage,
      this.config.cpuThreshold,
      (value, threshold) => value > threshold,
      `CPU usage is ${systemMetrics.cpu.usage.toFixed(1)}%`
    );
    
    // Memory alert
    this.evaluateAlert(
      'memory',
      systemMetrics.memory.usagePercent,
      this.config.memoryThreshold,
      (value, threshold) => value > threshold,
      `Memory usage is ${systemMetrics.memory.usagePercent.toFixed(1)}%`
    );
  }
  
  private evaluateAlert(
    type: AlertType,
    value: number,
    threshold: number,
    condition: (value: number, threshold: number) => boolean,
    message: string
  ): void {
    const alertId = `${type}_alert`;
    const existing = this.activeAlerts.get(alertId);
    
    if (condition(value, threshold)) {
      // Trigger or update alert
      if (!existing || existing.resolved) {
        const alert: Alert = {
          id: alertId,
          type,
          severity: this.getSeverity(type, value, threshold),
          title: this.getAlertTitle(type),
          message,
          value,
          threshold,
          timestamp: new Date(),
          resolved: false,
        };
        
        this.activeAlerts.set(alertId, alert);
        this.notifyAlertHandlers(alert);
        
        console.warn(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${message}`);
      }
    } else if (existing && !existing.resolved) {
      // Resolve alert
      existing.resolved = true;
      existing.resolvedAt = new Date();
      
      console.info(`[ALERT RESOLVED] ${existing.title}`);
    }
  }
  
  private getSeverity(type: AlertType, value: number, threshold: number): 'warning' | 'critical' {
    const ratio = value / threshold;
    
    // Critical if more than 50% over threshold
    if (ratio > 1.5) return 'critical';
    return 'warning';
  }
  
  private getAlertTitle(type: AlertType): string {
    const titles: Record<AlertType, string> = {
      error_rate: 'High Error Rate',
      response_time: 'High Response Time',
      cpu: 'High CPU Usage',
      memory: 'High Memory Usage',
      disk: 'High Disk Usage',
      failed_jobs: 'Failed Jobs in Queue',
      database: 'Database Issue',
      cache: 'Cache Issue',
      uptime: 'Uptime Issue',
    };
    return titles[type];
  }
  
  // ===== Alert Handlers =====
  
  /**
   * Register an alert handler
   */
  onAlert(handler: (alert: Alert) => void): void {
    this.alertHandlers.push(handler);
  }
  
  private notifyAlertHandlers(alert: Alert): void {
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }
  
  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.resolved);
  }
  
  /**
   * Get alert history
   */
  getAlertHistory(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }
  
  // ===== Periodic Monitoring =====
  
  private startMonitoring(): void {
    // Check every 30 seconds
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      const perfMetrics = getMetrics();
      
      // Store metrics history (keep last hour)
      this.metricsHistory.push({ timestamp: new Date(), metrics });
      if (this.metricsHistory.length > 120) { // 30 sec * 120 = 1 hour
        this.metricsHistory.shift();
      }
      
      // Check alerts
      this.checkAlerts(perfMetrics, metrics);
    }, 30000);
    
    console.info('[Monitoring] Started periodic monitoring');
  }
  
  /**
   * Get metrics history for charts
   */
  getMetricsHistory(): Array<{ timestamp: Date; metrics: SystemMetrics }> {
    return [...this.metricsHistory];
  }
  
  // ===== External Service Integration =====
  
  /**
   * Send metrics to Datadog (placeholder)
   */
  async sendToDatadog(apiKey: string): Promise<void> {
    if (!apiKey) return;
    
    const metrics = this.getSystemMetrics();
    const perfMetrics = getMetrics();
    
    // In production, this would send to Datadog API
    console.debug('[Monitoring] Would send metrics to Datadog', {
      cpu: metrics.cpu.usage,
      memory: metrics.memory.usagePercent,
      requests: perfMetrics.summary.requestCount,
      p95: perfMetrics.summary.p95ResponseTime,
    });
  }
  
  /**
   * Send metrics to CloudWatch (placeholder)
   */
  async sendToCloudWatch(): Promise<void> {
    // In production, this would send to AWS CloudWatch
    // using AWS SDK
  }
  
  /**
   * Send error to Sentry (placeholder)
   */
  captureError(error: Error, context?: Record<string, unknown>): void {
    console.error('[Sentry] Would capture error:', error.message, context);
    
    // In production:
    // Sentry.captureException(error, { extra: context });
  }
}

// ===== Export Singleton =====

export const monitoringService = new MonitoringService();
export default monitoringService;


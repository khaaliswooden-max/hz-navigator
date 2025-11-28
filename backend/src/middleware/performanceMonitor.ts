/**
 * Performance Monitoring Middleware
 * 
 * Tracks API response times, logs slow requests, and provides metrics.
 * 
 * Features:
 * - Response time tracking
 * - Slow request logging (>1 second)
 * - Metrics collection for monitoring
 * - Request/response size tracking
 */

import type { Request, Response, NextFunction } from 'express';

// ===== Types =====

export interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  slowRequestCount: number;
  errorCount: number;
  statusCodes: Record<number, number>;
  endpoints: Map<string, EndpointMetrics>;
  startTime: Date;
}

export interface EndpointMetrics {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
  p95Times: number[];
}

export interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  timestamp: Date;
  userId?: string;
  requestId?: string;
}

// ===== Configuration =====

const config = {
  slowThresholdMs: 1000,           // Log requests slower than 1 second
  warningThresholdMs: 500,         // Warn for requests slower than 500ms
  targetP95Ms: 200,                // Target p95 response time
  metricsRetentionMinutes: 60,     // How long to keep p95 samples
  enableDetailedLogging: process.env['NODE_ENV'] !== 'production',
};

// ===== Global Metrics Store =====

const metrics: PerformanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  slowRequestCount: 0,
  errorCount: 0,
  statusCodes: {},
  endpoints: new Map(),
  startTime: new Date(),
};

// Recent request times for p95 calculation
const recentResponseTimes: number[] = [];
const MAX_RECENT_SAMPLES = 1000;

// ===== Helper Functions =====

function getEndpointKey(method: string, path: string): string {
  // Normalize path by replacing IDs with :id
  const normalizedPath = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
  return `${method} ${normalizedPath}`;
}

function updateEndpointMetrics(key: string, responseTime: number, isError: boolean): void {
  let endpoint = metrics.endpoints.get(key);
  
  if (!endpoint) {
    endpoint = {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      p95Times: [],
    };
    metrics.endpoints.set(key, endpoint);
  }
  
  endpoint.count++;
  endpoint.totalTime += responseTime;
  endpoint.minTime = Math.min(endpoint.minTime, responseTime);
  endpoint.maxTime = Math.max(endpoint.maxTime, responseTime);
  
  if (isError) {
    endpoint.errors++;
  }
  
  // Keep last 100 times for p95 calculation
  endpoint.p95Times.push(responseTime);
  if (endpoint.p95Times.length > 100) {
    endpoint.p95Times.shift();
  }
}

function calculateP95(times: number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index] ?? sorted[sorted.length - 1] ?? 0;
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ===== Middleware =====

/**
 * Main performance monitoring middleware
 */
export function performanceMonitor(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = process.hrtime.bigint();
  const startTimestamp = new Date();
  
  // Capture request size
  const requestSize = parseInt(req.headers['content-length'] ?? '0', 10);
  
  // Get request ID if available
  const requestId = (req as Request & { requestId?: string }).requestId;
  const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
  
  // Capture response data
  const originalSend = res.send.bind(res);
  let responseSize = 0;
  
  res.send = function(body: unknown) {
    if (typeof body === 'string') {
      responseSize = Buffer.byteLength(body);
    } else if (Buffer.isBuffer(body)) {
      responseSize = body.length;
    }
    return originalSend(body);
  };
  
  // On response finish
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const responseTimeNs = endTime - startTime;
    const responseTimeMs = Number(responseTimeNs) / 1_000_000;
    
    // Update metrics
    metrics.requestCount++;
    metrics.totalResponseTime += responseTimeMs;
    metrics.statusCodes[res.statusCode] = (metrics.statusCodes[res.statusCode] ?? 0) + 1;
    
    if (res.statusCode >= 500) {
      metrics.errorCount++;
    }
    
    // Track recent response times for global p95
    recentResponseTimes.push(responseTimeMs);
    if (recentResponseTimes.length > MAX_RECENT_SAMPLES) {
      recentResponseTimes.shift();
    }
    
    // Update endpoint metrics
    const endpointKey = getEndpointKey(req.method, req.path);
    updateEndpointMetrics(endpointKey, responseTimeMs, res.statusCode >= 400);
    
    // Log slow requests
    if (responseTimeMs >= config.slowThresholdMs) {
      metrics.slowRequestCount++;
      
      console.warn(`[SLOW REQUEST] ${req.method} ${req.path}`, {
        responseTime: formatResponseTime(responseTimeMs),
        statusCode: res.statusCode,
        requestId,
        userId,
        query: req.query,
        requestSize,
        responseSize,
      });
    } else if (responseTimeMs >= config.warningThresholdMs && config.enableDetailedLogging) {
      console.info(`[WARN] Slow response: ${req.method} ${req.path} - ${formatResponseTime(responseTimeMs)}`);
    }
    
    // Add response time header
    res.setHeader('X-Response-Time', `${responseTimeMs.toFixed(2)}ms`);
    
    // Log all requests in development
    if (config.enableDetailedLogging) {
      console.debug(`[PERF] ${req.method} ${req.path} ${res.statusCode} ${formatResponseTime(responseTimeMs)}`);
    }
  });
  
  next();
}

// ===== Metrics API =====

/**
 * Get current performance metrics
 */
export function getMetrics(): {
  summary: {
    uptime: number;
    requestCount: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    slowRequestCount: number;
    errorCount: number;
    errorRate: number;
    requestsPerSecond: number;
  };
  statusCodes: Record<number, number>;
  endpoints: Array<{
    endpoint: string;
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    p95Time: number;
    errorRate: number;
  }>;
} {
  const uptimeMs = Date.now() - metrics.startTime.getTime();
  const uptimeSeconds = uptimeMs / 1000;
  
  const avgResponseTime = metrics.requestCount > 0
    ? metrics.totalResponseTime / metrics.requestCount
    : 0;
  
  const p95 = calculateP95(recentResponseTimes);
  
  const endpointStats = Array.from(metrics.endpoints.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      minTime: stats.minTime === Infinity ? 0 : stats.minTime,
      maxTime: stats.maxTime,
      p95Time: calculateP95(stats.p95Times),
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
    }))
    .sort((a, b) => b.avgTime - a.avgTime);
  
  return {
    summary: {
      uptime: uptimeSeconds,
      requestCount: metrics.requestCount,
      averageResponseTime: avgResponseTime,
      p95ResponseTime: p95,
      slowRequestCount: metrics.slowRequestCount,
      errorCount: metrics.errorCount,
      errorRate: metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0,
      requestsPerSecond: uptimeSeconds > 0 ? metrics.requestCount / uptimeSeconds : 0,
    },
    statusCodes: { ...metrics.statusCodes },
    endpoints: endpointStats,
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  metrics.requestCount = 0;
  metrics.totalResponseTime = 0;
  metrics.slowRequestCount = 0;
  metrics.errorCount = 0;
  metrics.statusCodes = {};
  metrics.endpoints.clear();
  metrics.startTime = new Date();
  recentResponseTimes.length = 0;
}

/**
 * Get health check data including performance metrics
 */
export function getHealthWithMetrics(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: ReturnType<typeof getMetrics>['summary'];
  issues: string[];
} {
  const currentMetrics = getMetrics();
  const issues: string[] = [];
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  // Check p95 response time
  if (currentMetrics.summary.p95ResponseTime > config.targetP95Ms * 2) {
    issues.push(`High p95 response time: ${currentMetrics.summary.p95ResponseTime.toFixed(2)}ms`);
    status = 'unhealthy';
  } else if (currentMetrics.summary.p95ResponseTime > config.targetP95Ms) {
    issues.push(`Elevated p95 response time: ${currentMetrics.summary.p95ResponseTime.toFixed(2)}ms`);
    status = 'degraded';
  }
  
  // Check error rate
  if (currentMetrics.summary.errorRate > 0.05) {
    issues.push(`High error rate: ${(currentMetrics.summary.errorRate * 100).toFixed(2)}%`);
    status = 'unhealthy';
  } else if (currentMetrics.summary.errorRate > 0.01) {
    issues.push(`Elevated error rate: ${(currentMetrics.summary.errorRate * 100).toFixed(2)}%`);
    if (status === 'healthy') status = 'degraded';
  }
  
  return {
    status,
    metrics: currentMetrics.summary,
    issues,
  };
}

/**
 * Express route handler for metrics endpoint
 */
export function metricsHandler(
  _req: Request,
  res: Response
): void {
  res.json({
    success: true,
    data: getMetrics(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Express route handler for health with metrics
 */
export function healthMetricsHandler(
  _req: Request,
  res: Response
): void {
  const health = getHealthWithMetrics();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: health,
    timestamp: new Date().toISOString(),
  });
}

export default performanceMonitor;


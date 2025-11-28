/**
 * Audit Logging Middleware
 * 
 * Automatically logs API requests and responses for audit purposes.
 * Integrates with the audit service for centralized logging.
 */

import { auditService } from '../services/auditService.js';

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';

// ===== Types =====

interface AuditConfig {
  // Paths to always skip logging (health checks, etc.)
  skipPaths: string[];
  // Paths to log with high priority (sensitive operations)
  sensitivePaths: RegExp[];
  // Log response body for certain paths
  logResponseBody: RegExp[];
  // Maximum body size to log (bytes)
  maxBodySize: number;
}

// ===== Configuration =====

const defaultConfig: AuditConfig = {
  skipPaths: [
    '/api/health',
    '/api/health/ready',
    '/api/health/live',
    '/favicon.ico',
    '/robots.txt',
  ],
  sensitivePaths: [
    /\/api\/v1\/admin\/.*/,
    /\/api\/documents\/.*/,
    /\/api\/.*\/export/,
    /\/api\/.*\/bulk\/.*/,
  ],
  logResponseBody: [
    /\/api\/v1\/admin\/.*/,
  ],
  maxBodySize: 10 * 1024, // 10KB
};

// ===== Helper Functions =====

function shouldSkip(path: string, config: AuditConfig): boolean {
  return config.skipPaths.some((skipPath) => path.startsWith(skipPath));
}

function isSensitive(path: string, config: AuditConfig): boolean {
  return config.sensitivePaths.some((pattern) => pattern.test(path));
}

function truncateBody(body: unknown, maxSize: number): unknown {
  if (!body) return body;
  
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length > maxSize) {
    return { _truncated: true, size: str.length, preview: str.substring(0, 200) };
  }
  
  return body;
}

function sanitizeForLog(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'authorization', 'cookie',
    'ssn', 'ein', 'tax_id', 'bank_account', 'credit_card',
  ];
  
  const sanitized = { ...obj } as Record<string, unknown>;
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }
  
  return sanitized;
}

// ===== Middleware =====

/**
 * Create audit logging middleware
 */
export function createAuditMiddleware(customConfig?: Partial<AuditConfig>) {
  const config = { ...defaultConfig, ...customConfig };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip paths that don't need auditing
    if (shouldSkip(req.path, config)) {
      next();
      return;
    }

    const startTime = Date.now();
    const requestId = (req as Request & { requestId?: string }).requestId;
    const authReq = req as AuthenticatedRequest;
    const isSensitivePath = isSensitive(req.path, config);

    // Capture original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let responseBody: unknown;

    // Override json to capture response
    res.json = function (body: unknown) {
      responseBody = body;
      return originalJson(body);
    };

    // Override send to capture response
    res.send = function (body: unknown) {
      responseBody = body;
      return originalSend(body);
    };

    // Log on response finish
    res.on('finish', async () => {
      const duration = Date.now() - startTime;

      try {
        // Determine action based on method and path
        let action: string = 'API_REQUEST';
        if (res.statusCode >= 400) {
          action = res.statusCode >= 500 ? 'API_ERROR' : 'API_VALIDATION_ERROR';
        }

        // Build metadata
        const metadata: Record<string, unknown> = {
          method: req.method,
          path: req.path,
          query: sanitizeForLog(req.query),
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length'),
        };

        // Add request body for mutations (but sanitize)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          metadata.requestBody = truncateBody(
            sanitizeForLog(req.body),
            config.maxBodySize
          );
        }

        // Add response body for sensitive paths on errors
        if ((isSensitivePath || res.statusCode >= 400) && responseBody) {
          metadata.responseBody = truncateBody(
            sanitizeForLog(responseBody),
            config.maxBodySize
          );
        }

        // Log to audit service
        await auditService.log({
          userId: authReq.user?.userId,
          action: action as Parameters<typeof auditService.log>[0]['action'],
          entityType: 'api',
          description: `${req.method} ${req.path}`,
          metadata,
          ipAddress: (req.ip || req.socket.remoteAddress) as string,
          userAgent: req.headers['user-agent'],
          requestId,
          requestMethod: req.method,
          requestPath: req.path,
          responseStatus: res.statusCode,
          severity: res.statusCode >= 500 ? 'high' : (res.statusCode >= 400 ? 'medium' : 'low'),
        });
      } catch (error) {
        // Don't fail the request if audit logging fails
        console.error('[Audit] Failed to log request:', error);
      }
    });

    next();
  };
}

/**
 * Middleware to log specific sensitive operations
 */
export function logSensitiveOperation(
  action: Parameters<typeof auditService.log>[0]['action'],
  entityType: Parameters<typeof auditService.log>[0]['entityType'],
  getEntityId?: (req: Request) => string | undefined
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const entityId = getEntityId?.(req);

    try {
      await auditService.log({
        userId: authReq.user?.userId,
        action,
        entityType,
        entityId,
        description: `${req.method} ${req.path}`,
        metadata: {
          params: req.params,
          query: sanitizeForLog(req.query),
        },
        ipAddress: (req.ip || req.socket.remoteAddress) as string,
        userAgent: req.headers['user-agent'],
        requestId: (req as Request & { requestId?: string }).requestId,
        requestMethod: req.method,
        requestPath: req.path,
        severity: 'high',
      });
    } catch (error) {
      console.error('[Audit] Failed to log sensitive operation:', error);
    }

    next();
  };
}

/**
 * Middleware for logging authentication attempts
 */
export function logAuthAttempt(success: boolean, reason?: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      await auditService.logAuth(
        success ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILED',
        req,
        {
          userId: authReq.user?.userId,
          email: req.body?.email,
          success,
          reason,
        }
      );
    } catch (error) {
      console.error('[Audit] Failed to log auth attempt:', error);
    }

    next();
  };
}

export default createAuditMiddleware;


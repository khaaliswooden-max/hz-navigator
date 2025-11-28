/**
 * HZ Navigator - Sentry Configuration
 * 
 * Error tracking and performance monitoring configuration for backend
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

/**
 * Initialize Sentry for the backend application
 */
export function initSentry(config: SentryConfig): void {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release || process.env.RELEASE_VERSION || 'unknown',
    
    // Error sampling
    sampleRate: config.sampleRate ?? 1.0,
    
    // Performance monitoring
    tracesSampleRate: config.tracesSampleRate ?? (config.environment === 'production' ? 0.1 : 1.0),
    
    // Profiling
    profilesSampleRate: config.profilesSampleRate ?? (config.environment === 'production' ? 0.1 : 1.0),
    
    integrations: [
      // Automatic instrumentation
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express(),
      new Sentry.Integrations.Postgres(),
      new ProfilingIntegration(),
    ],
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      
      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
        try {
          const data = typeof event.request.data === 'string' 
            ? JSON.parse(event.request.data) 
            : event.request.data;
          
          for (const field of sensitiveFields) {
            if (data[field]) {
              data[field] = '[FILTERED]';
            }
          }
          
          event.request.data = JSON.stringify(data);
        } catch {
          // If parsing fails, keep original data
        }
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Ignore common non-actionable errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /^Network Error$/,
      /^Request aborted$/,
      /^timeout of \d+ms exceeded$/,
    ],
    
    // Set custom tags
    initialScope: {
      tags: {
        'service.name': 'hz-navigator-backend',
        'service.version': process.env.npm_package_version || 'unknown',
      },
    },
  });
}

/**
 * Configure Sentry request handler for Express
 */
export function setupSentryRequestHandler(app: Express): void {
  // RequestHandler creates a separate execution context
  app.use(Sentry.Handlers.requestHandler({
    // Include user info in error reports
    user: ['id', 'email', 'role'],
    // Include IP address
    ip: true,
    // Include request data
    request: ['headers', 'method', 'url', 'query_string'],
  }));
  
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

/**
 * Configure Sentry error handler for Express
 * Must be added after all routes
 */
export function setupSentryErrorHandler(app: Express): void {
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only report server errors (5xx) and some client errors
      if (error.status === undefined) return true;
      return error.status >= 400 && error.status !== 404;
    },
  }));
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email: string; role?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture custom exception with context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id: string; email: string };
  }
): string {
  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

/**
 * Capture custom message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string {
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction {
  return Sentry.startTransaction({ name, op });
}

/**
 * Create a child span within a transaction
 */
export function createSpan(
  transaction: Sentry.Transaction,
  op: string,
  description: string
): Sentry.Span {
  return transaction.startChild({ op, description });
}

/**
 * Flush pending events before shutdown
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

// Export Sentry for direct access if needed
export { Sentry };

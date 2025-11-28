/**
 * =============================================================================
 * Sentry Configuration for HZ-Navigator
 * =============================================================================
 * This file should be imported at the very beginning of the application entry point.
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(config: SentryConfig): void {
  const {
    dsn,
    environment,
    release = process.env.npm_package_version || '1.0.0',
    sampleRate = 1.0,
    tracesSampleRate = environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate = environment === 'production' ? 0.1 : 1.0,
  } = config;

  if (!dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release: `hz-navigator@${release}`,
    
    // Error sampling
    sampleRate,
    
    // Performance monitoring
    tracesSampleRate,
    
    // Profiling
    profilesSampleRate,
    
    integrations: [
      // Enable profiling
      new ProfilingIntegration(),
      
      // Capture HTTP requests
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Capture Express requests
      new Sentry.Integrations.Express(),
      
      // Capture Postgres queries
      new Sentry.Integrations.Postgres(),
      
      // Capture Redis operations
      // new Sentry.Integrations.Redis(),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const data = typeof event.request.data === 'string' 
          ? JSON.parse(event.request.data) 
          : event.request.data;
        
        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.ssn) data.ssn = '[REDACTED]';
        if (data.creditCard) data.creditCard = '[REDACTED]';
        
        event.request.data = JSON.stringify(data);
      }

      // Filter out specific errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Don't send 404 errors
        if (error.message.includes('Not Found')) {
          return null;
        }
        
        // Don't send rate limit errors
        if (error.message.includes('Too Many Requests')) {
          return null;
        }
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Remove sensitive URLs
      if (breadcrumb.data?.url) {
        const url = new URL(breadcrumb.data.url);
        if (url.searchParams.has('token')) {
          url.searchParams.set('token', '[REDACTED]');
          breadcrumb.data.url = url.toString();
        }
      }
      return breadcrumb;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      
      // Network errors
      'Network request failed',
      'Failed to fetch',
      
      // User-caused errors
      'User cancelled',
      'AbortError',
    ],

    // Limit breadcrumbs
    maxBreadcrumbs: 50,

    // Attach stack traces to messages
    attachStacktrace: true,

    // Normalize depth for context
    normalizeDepth: 5,
  });

  console.log(`Sentry initialized for ${environment}`);
}

/**
 * Capture a custom error with additional context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'error'
): string {
  return Sentry.captureException(error, {
    level,
    extra: context,
  });
}

/**
 * Capture a custom message
 */
export function captureMessage(
  message: string,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
): string {
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: {
  id: string;
  email?: string;
  role?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Don't include PII like names
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add custom context to errors
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  Sentry.setContext(name, context);
}

/**
 * Add custom tag
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Create a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction {
  return Sentry.startTransaction({ name, op });
}

/**
 * Express error handler middleware
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all errors except 404s
    if ((error as any).statusCode === 404) {
      return false;
    }
    return true;
  },
});

/**
 * Express request handler middleware
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  // Include request data in errors
  request: ['method', 'url', 'query_string'],
  
  // Include transaction for performance
  transaction: 'methodPath',
  
  // Include user if available
  user: ['id', 'email'],
});

/**
 * Express tracing handler middleware
 */
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();

// Export Sentry for direct access
export { Sentry };


/**
 * HZ Navigator - Sentry Configuration (Frontend)
 * 
 * Error tracking and performance monitoring for the React frontend
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
}

/**
 * Initialize Sentry for the frontend application
 */
export function initSentry(config: SentryConfig): void {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release || import.meta.env.VITE_VERSION || 'unknown',
    
    // Performance monitoring
    tracesSampleRate: config.environment === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: config.environment === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    
    integrations: [
      new BrowserTracing({
        // Trace all routes
        routingInstrumentation: Sentry.reactRouterV6Instrumentation,
        // Trace these origins
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/api\.hz-navigator\.com/,
          /^https:\/\/api-staging\.hz-navigator\.com/,
        ],
      }),
      new Sentry.Replay({
        // Mask all text and inputs for privacy
        maskAllText: false,
        maskAllInputs: true,
        // Block sensitive elements
        blockAllMedia: false,
      }),
    ],
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive URL parameters
      if (event.request?.url) {
        const url = new URL(event.request.url);
        ['token', 'password', 'secret', 'key'].forEach(param => {
          if (url.searchParams.has(param)) {
            url.searchParams.set(param, '[FILTERED]');
          }
        });
        event.request.url = url.toString();
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors
      'Network Error',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
      // User actions
      'Non-Error promise rejection captured',
      // Third-party scripts
      /^Script error\.?$/,
      /^Javascript error: Script error\.? on line 0$/,
    ],
    
    // Deny specific URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
    ],
    
    // Set custom tags
    initialScope: {
      tags: {
        'app.name': 'hz-navigator-frontend',
      },
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { 
  id: string; 
  email: string; 
  role?: string;
  businessId?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
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
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Capture custom exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture custom message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Create error boundary wrapper component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Higher-order component for profiling
 */
export const withSentryProfiler = Sentry.withProfiler;

/**
 * Track a user action
 */
export function trackAction(
  action: string,
  category: string,
  data?: Record<string, unknown>
): void {
  addBreadcrumb(action, category, data);
  
  // Also track as a custom event for analytics
  Sentry.captureMessage(`User Action: ${action}`, {
    level: 'info',
    tags: { category },
    extra: data,
  });
}

/**
 * Start a performance transaction for a user flow
 */
export function startUserFlow(name: string): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op: 'user-flow',
  });
}

// Export Sentry for direct access
export { Sentry };


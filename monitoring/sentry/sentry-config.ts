/**
 * Sentry Configuration
 * 
 * Error tracking and performance monitoring configuration for Sentry.
 * Used in both frontend and backend applications.
 */

// ===== Frontend Sentry Configuration =====

export const frontendSentryConfig = {
  dsn: process.env['VITE_SENTRY_DSN'] || '',
  environment: process.env['NODE_ENV'] || 'development',
  release: process.env['VITE_APP_VERSION'] || '1.0.0',
  
  // Performance monitoring
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,
  
  // Session replay for error reproduction
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Integrations
  integrations: [
    // Browser tracing for performance
    'BrowserTracing',
    // Replay integration for session recording
    'Replay',
  ],
  
  // Tracing configuration
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/api\.hz-navigator\.com/,
    /^https:\/\/.*\.hz-navigator\.com/,
  ],
  
  // Filter options
  beforeSend: (event: Record<string, unknown>) => {
    // Don't send errors in development
    if (process.env['NODE_ENV'] === 'development') {
      console.error('[Sentry] Would send event:', event);
      return null;
    }
    return event;
  },
  
  // Ignore common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    
    // Network errors
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    
    // User actions
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    
    // Third party
    /^Script error\.?$/,
  ],
  
  // Deny URLs (third party scripts)
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    
    // Firefox extensions
    /^resource:\/\//i,
    /^moz-extension:\/\//i,
    
    // Safari extensions
    /^safari-web-extension:\/\//i,
    
    // Third party
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
  ],
};

// ===== Backend Sentry Configuration =====

export const backendSentryConfig = {
  dsn: process.env['SENTRY_DSN'] || '',
  environment: process.env['NODE_ENV'] || 'development',
  release: process.env['APP_VERSION'] || '1.0.0',
  
  // Performance monitoring
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.5 : 1.0,
  profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 0,
  
  // Integrations (for @sentry/node)
  integrations: [
    'Http',
    'Express',
    'Postgres',
  ],
  
  // Filter sensitive data
  beforeSend: (event: Record<string, unknown>) => {
    // Remove sensitive headers
    if (event['request']) {
      const request = event['request'] as Record<string, unknown>;
      if (request['headers']) {
        const headers = request['headers'] as Record<string, unknown>;
        delete headers['authorization'];
        delete headers['cookie'];
        delete headers['x-api-key'];
      }
    }
    return event;
  },
  
  // Breadcrumb filtering
  beforeBreadcrumb: (breadcrumb: Record<string, unknown>) => {
    // Filter out health check requests
    if (breadcrumb['category'] === 'http' && 
        (breadcrumb['data'] as Record<string, unknown>)?.['url']?.toString().includes('/health')) {
      return null;
    }
    return breadcrumb;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'socket hang up',
  ],
  
  // Server name (for multi-instance tracking)
  serverName: process.env['HOSTNAME'] || 'hz-navigator-api',
  
  // Maximum breadcrumbs to capture
  maxBreadcrumbs: 50,
  
  // Attach stack trace to messages
  attachStacktrace: true,
};

// ===== Alert Rules =====

export const sentryAlertRules = {
  // High error rate alert
  highErrorRate: {
    name: 'High Error Rate',
    conditions: {
      interval: '1h',
      comparisonType: 'percent',
      value: 5,
    },
    filters: {
      level: ['error', 'fatal'],
    },
    actions: ['slack', 'pagerduty'],
  },
  
  // New error alert
  newError: {
    name: 'New Error Detected',
    conditions: {
      eventType: 'first_seen_event',
    },
    filters: {
      level: ['error', 'fatal'],
    },
    actions: ['slack'],
  },
  
  // Performance degradation alert
  performanceDegradation: {
    name: 'Performance Degradation',
    conditions: {
      metric: 'p95_latency',
      threshold: 2000,
    },
    actions: ['slack'],
  },
};

// ===== Tag Configuration =====

export const sentryTags = {
  // User context tags
  user: ['id', 'email', 'role'],
  
  // Request context tags
  request: ['method', 'url', 'ip'],
  
  // Custom tags
  custom: [
    'business_id',
    'certification_id',
    'action_type',
    'component',
    'feature',
  ],
};

// ===== Example Usage =====
/*

// Frontend (React with Vite)
import * as Sentry from '@sentry/react';

Sentry.init({
  ...frontendSentryConfig,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      ),
    }),
    new Sentry.Replay(),
  ],
});

// Wrap root component
const SentryApp = Sentry.withProfiler(App);

// Backend (Express)
import * as Sentry from '@sentry/node';

Sentry.init(backendSentryConfig);

// Request handler
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler (after routes)
app.use(Sentry.Handlers.errorHandler());

// Manual error capture
Sentry.captureException(error, {
  tags: { business_id: businessId },
  extra: { context: 'compliance_check' },
});

*/

export default {
  frontend: frontendSentryConfig,
  backend: backendSentryConfig,
  alerts: sentryAlertRules,
  tags: sentryTags,
};


/**
 * Security Middleware Configuration
 * 
 * Centralized security configuration including:
 * - CORS with strict origin whitelist
 * - Helmet with CSP and security headers
 * - HTTPS enforcement
 */

import cors from 'cors';
import helmet from 'helmet';

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { CorsOptions } from 'cors';
import type { HelmetOptions } from 'helmet';

// ===== Environment Detection =====

const isProduction = process.env['NODE_ENV'] === 'production';
const isDevelopment = process.env['NODE_ENV'] === 'development';

// ===== CORS Configuration =====

// Whitelist of allowed origins
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  // Production origins
  if (process.env['CORS_ORIGINS']) {
    origins.push(...process.env['CORS_ORIGINS'].split(',').map((o) => o.trim()));
  }

  // Default production origin
  if (process.env['CORS_ORIGIN']) {
    origins.push(process.env['CORS_ORIGIN']);
  }

  // Development origins
  if (isDevelopment) {
    origins.push(
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // Alternative port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    );
  }

  return [...new Set(origins)]; // Remove duplicates
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, curl, etc.) in development
    if (!origin && isDevelopment) {
      callback(null, true);
      return;
    }

    // Check if origin is in whitelist
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // In production, reject unknown origins
    if (isProduction) {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
      return;
    }

    // In development, log warning but allow
    if (isDevelopment) {
      console.warn(`[CORS] Allowing unlisted origin in development: ${origin}`);
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow credentials (cookies, auth headers)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-Request-ID',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
  ],
  maxAge: 86400, // Preflight cache for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);

// ===== Helmet Security Headers Configuration =====

const helmetOptions: HelmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Add trusted CDNs if needed
        ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline styles
        'https://fonts.googleapis.com',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.amazonaws.com', // S3 images
        'https://api.mapbox.com',
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
      ],
      connectSrc: [
        "'self'",
        ...(isDevelopment
          ? ['http://localhost:*', 'ws://localhost:*']
          : []),
        'https://api.mapbox.com',
        'https://*.amazonaws.com',
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },

  // X-Frame-Options: DENY (clickjacking protection)
  frameguard: { action: 'deny' },

  // X-Content-Type-Options: nosniff
  noSniff: true,

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },

  // X-Download-Options (IE specific)
  ieNoOpen: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Permissions-Policy (Feature-Policy successor)
  // Note: Using custom header as helmet doesn't fully support this yet
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: isProduction ? { policy: 'require-corp' } : false,

  // Strict-Transport-Security (HSTS)
  hsts: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,
};

export const helmetMiddleware = helmet(helmetOptions);

// ===== Custom Permissions-Policy Header =====

export const permissionsPolicyMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=(self)', // Allow geolocation for map features
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()', // Disable FLoC
    ].join(', ')
  );
  next();
};

// ===== HTTPS Enforcement =====

export const httpsEnforcement = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip in development
  if (!isProduction) {
    next();
    return;
  }

  // Check various headers that proxies use
  const isSecure =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['x-forwarded-ssl'] === 'on';

  if (!isSecure) {
    // Redirect to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    res.redirect(301, httpsUrl);
    return;
  }

  next();
};

// ===== Request ID Middleware =====

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// ===== Trust Proxy Configuration =====

export const configureTrustProxy = (): string | number | boolean => {
  // In production behind a load balancer/proxy
  if (isProduction) {
    // Trust first proxy
    return 1;
  }
  return false;
};

// ===== Combined Security Middleware =====

export const securityMiddleware: RequestHandler[] = [
  requestIdMiddleware,
  httpsEnforcement,
  helmetMiddleware as RequestHandler,
  permissionsPolicyMiddleware,
  corsMiddleware,
];

export default {
  cors: corsMiddleware,
  helmet: helmetMiddleware,
  permissionsPolicy: permissionsPolicyMiddleware,
  httpsEnforcement,
  requestId: requestIdMiddleware,
  configureTrustProxy,
  securityMiddleware,
};


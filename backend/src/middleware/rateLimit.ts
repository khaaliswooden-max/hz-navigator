/**
 * Rate Limiting Middleware
 * 
 * Provides different rate limiting configurations for various endpoint types:
 * - Auth endpoints: 5 attempts / 15 minutes (strict for login/register)
 * - API endpoints: 100 requests / 15 minutes (general API)
 * - Document upload: 10 uploads / hour (prevent abuse)
 * 
 * Returns 429 Too Many Requests when limit is exceeded.
 */

import rateLimit from 'express-rate-limit';

import type { Request, Response } from 'express';
import type { Options } from 'express-rate-limit';

// Custom key generator that considers user ID and IP
const keyGenerator = (req: Request): string => {
  const userId = (req as Request & { user?: { userId: string } }).user?.userId;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return userId ? `${userId}:${ip}` : ip;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response): void => {
  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: res.getHeader('Retry-After'),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};

// Common configuration
const baseConfig: Partial<Options> = {
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler,
  keyGenerator,
};

/**
 * Rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 * Strict limit to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per 15 minutes per user/IP
 */
export const apiRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: 'Too many API requests. Please slow down.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for document upload endpoints
 * 10 uploads per hour per user/IP
 * Stricter limit to prevent storage abuse
 */
export const uploadRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads
  message: 'Upload limit reached. Please try again in an hour.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for password reset endpoints
 * 3 attempts per hour per IP
 * Very strict to prevent enumeration attacks
 */
export const passwordResetRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: 'Too many password reset attempts. Please try again in an hour.',
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
});

/**
 * Rate limiter for sensitive operations
 * 20 operations per 15 minutes per user
 * For data exports, bulk operations, etc.
 */
export const sensitiveOperationRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 operations
  message: 'Too many sensitive operations. Please wait before trying again.',
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Strict rate limiter for admin endpoints
 * 50 requests per 15 minutes
 */
export const adminRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests
  message: 'Admin rate limit exceeded.',
});

export default {
  auth: authRateLimiter,
  api: apiRateLimiter,
  upload: uploadRateLimiter,
  passwordReset: passwordResetRateLimiter,
  sensitiveOperation: sensitiveOperationRateLimiter,
  admin: adminRateLimiter,
};


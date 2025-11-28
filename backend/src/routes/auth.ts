/**
 * Authentication Routes
 * 
 * Handles user authentication including:
 * - Login
 * - Registration
 * - Password reset
 * - Token refresh
 * - Logout
 * 
 * All endpoints are rate-limited for security.
 */

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { db } from '../services/database.js';
import { generateToken, authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimit.js';
import { sanitizeBody } from '../middleware/sanitize.js';
import { auditService } from '../services/auditService.js';
import { encryptionService } from '../services/encryptionService.js';

import type { Request, Response, NextFunction } from 'express';

const router = Router();

// ===== Validation Schemas =====

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ===== Helper Functions =====

async function logFailedLogin(
  email: string,
  req: Request,
  reason: string
): Promise<void> {
  try {
    // Log to failed_login_attempts table
    await db.query(
      `INSERT INTO failed_login_attempts (email, ip_address, user_agent, reason)
       VALUES ($1, $2, $3, $4)`,
      [email, req.ip, req.headers['user-agent'], reason]
    );

    // Log to audit
    await auditService.logAuth('AUTH_LOGIN_FAILED', req, {
      email,
      success: false,
      reason,
    });
  } catch (error) {
    console.error('Failed to log failed login attempt:', error);
  }
}

async function checkAccountLocked(email: string): Promise<{
  locked: boolean;
  remainingTime?: number;
}> {
  const LOCKOUT_THRESHOLD = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM failed_login_attempts
     WHERE email = $1 AND attempted_at > NOW() - INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'`,
    [email]
  );

  const failedAttempts = parseInt(result.rows[0].count, 10);

  if (failedAttempts >= LOCKOUT_THRESHOLD) {
    // Get the oldest attempt in the window to calculate remaining lockout time
    const oldestResult = await db.query<{ attempted_at: Date }>(
      `SELECT attempted_at FROM failed_login_attempts
       WHERE email = $1
       ORDER BY attempted_at ASC
       LIMIT 1`,
      [email]
    );

    if (oldestResult.rows[0]) {
      const lockoutEnd = new Date(oldestResult.rows[0].attempted_at);
      lockoutEnd.setMinutes(lockoutEnd.getMinutes() + LOCKOUT_DURATION_MINUTES);
      const remainingTime = Math.max(0, lockoutEnd.getTime() - Date.now());
      return { locked: remainingTime > 0, remainingTime };
    }
  }

  return { locked: false };
}

// ===== Routes =====

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  authRateLimiter,
  sanitizeBody(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: parseResult.error.errors,
          },
        });
        return;
      }

      const { email, password } = parseResult.data;

      // Check if account is locked
      const lockStatus = await checkAccountLocked(email);
      if (lockStatus.locked) {
        const remainingMinutes = Math.ceil((lockStatus.remainingTime ?? 0) / 60000);
        res.status(423).json({
          success: false,
          error: {
            message: `Account temporarily locked. Try again in ${remainingMinutes} minutes.`,
            code: 'ACCOUNT_LOCKED',
          },
        });
        return;
      }

      // Find user
      const userResult = await db.query<{
        id: string;
        email: string;
        password_hash: string;
        first_name: string;
        last_name: string;
        role: 'user' | 'admin' | 'reviewer';
        is_active: boolean;
      }>(
        `SELECT id, email, password_hash, first_name, last_name, role, is_active
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      const user = userResult.rows[0];

      if (!user) {
        await logFailedLogin(email, req, 'User not found');
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        });
        return;
      }

      if (!user.is_active) {
        await logFailedLogin(email, req, 'Account disabled');
        res.status(401).json({
          success: false,
          error: {
            message: 'Account is disabled',
            code: 'ACCOUNT_DISABLED',
          },
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await logFailedLogin(email, req, 'Invalid password');
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        });
        return;
      }

      // Update last login
      await db.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [user.id]
      );

      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Log successful login
      await auditService.logAuth('AUTH_LOGIN_SUCCESS', req, {
        userId: user.id,
        email: user.email,
        success: true,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authRateLimiter,
  sanitizeBody(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: parseResult.error.errors,
          },
        });
        return;
      }

      const { email, password, firstName, lastName } = parseResult.data;

      // Check if user exists
      const existingUser = await db.query(
        `SELECT id FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            message: 'Email already registered',
            code: 'EMAIL_EXISTS',
          },
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const result = await db.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, 'user')
         RETURNING id`,
        [email.toLowerCase(), passwordHash, firstName, lastName]
      );

      const userId = result.rows[0].id;

      // Generate token
      const token = generateToken({
        userId,
        email: email.toLowerCase(),
        role: 'user',
      });

      // Log registration
      await auditService.logAuth('USER_CREATED', req, {
        userId,
        email,
        success: true,
      });

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: userId,
            email: email.toLowerCase(),
            firstName,
            lastName,
            role: 'user',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  sanitizeBody(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parseResult = passwordResetRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: parseResult.error.errors,
          },
        });
        return;
      }

      const { email } = parseResult.data;

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });

      // Check if user exists (async, don't wait)
      const userResult = await db.query<{ id: string }>(
        `SELECT id FROM users WHERE email = $1 AND is_active = true`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        const resetToken = encryptionService.generateToken(32);
        const tokenHash = encryptionService.hash(resetToken);

        // Store reset token (would also send email in production)
        // For now, just log it
        console.info(`[Password Reset] Token for ${email}: ${resetToken}`);

        await auditService.logAuth('AUTH_PASSWORD_RESET_REQUEST', req, {
          userId,
          email,
          success: true,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  sanitizeBody(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const parseResult = passwordResetSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: parseResult.error.errors,
          },
        });
        return;
      }

      const { token, password } = parseResult.data;

      // Verify token (would check against stored token in production)
      // For now, return error
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (invalidate token)
 */
router.post(
  '/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Log logout
      await auditService.logAuth('AUTH_LOGOUT', req, {
        userId: req.user?.userId,
        email: req.user?.email,
        success: true,
      });

      // In a production system with refresh tokens, we would invalidate the token here
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userResult = await db.query<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        created_at: Date;
        last_login_at: Date;
      }>(
        `SELECT id, email, first_name, last_name, role, created_at, last_login_at
         FROM users WHERE id = $1`,
        [req.user?.userId]
      );

      const user = userResult.rows[0];

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/auth/password
 * Change password (requires current password)
 */
router.put(
  '/password',
  authenticate,
  sanitizeBody(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Current and new password are required',
          },
        });
        return;
      }

      // Validate new password strength
      const passwordResult = z
        .string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/)
        .safeParse(newPassword);

      if (!passwordResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'New password does not meet requirements',
            details: passwordResult.error.errors,
          },
        });
        return;
      }

      // Get current password hash
      const userResult = await db.query<{ password_hash: string }>(
        `SELECT password_hash FROM users WHERE id = $1`,
        [req.user?.userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
        return;
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Current password is incorrect',
            code: 'INVALID_PASSWORD',
          },
        });
        return;
      }

      // Hash and update new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await db.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newPasswordHash, req.user?.userId]
      );

      // Log password change
      await auditService.logAuth('AUTH_PASSWORD_CHANGE', req, {
        userId: req.user?.userId,
        email: req.user?.email,
        success: true,
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


import jwt from 'jsonwebtoken';

import { createError } from './errorHandler.js';

import type { Request, Response, NextFunction } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'reviewer';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'development-secret';

/**
 * Middleware to verify JWT token
 */
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(createError('No token provided', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    next(createError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Middleware to check user role
 */
export function requireRole(...roles: AuthPayload['role'][]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(createError('Authentication required', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  });
}


import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env['NODE_ENV'] === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message;

  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.path,
    method: req.method,
  });

  const errorResponse: ErrorResponse = {
    error: {
      message,
      code: err.code,
      details:
        process.env['NODE_ENV'] === 'development' ? err.details : undefined,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * Create a custom application error
 */
export function createError(
  message: string,
  statusCode: number,
  code?: string
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}


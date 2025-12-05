/**
 * Input Sanitization Middleware
 * 
 * Provides XSS prevention, SQL injection protection, and input validation.
 * Uses JSDOM + DOMPurify for HTML sanitization.
 */

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { z } from 'zod';

import type { Request, Response, NextFunction } from 'express';

// Initialize DOMPurify with JSDOM
const jsdomWindow = new JSDOM('').window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOMPurify = createDOMPurify(jsdomWindow as any);

// Configure DOMPurify - strip all HTML tags by default
const purifyConfig = {
  ALLOWED_TAGS: [], // No HTML tags allowed by default
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

// Less restrictive config for rich text fields
const richTextPurifyConfig = {
  ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize a string value
 */
export function sanitizeString(value: string, allowRichText = false): string {
  if (typeof value !== 'string') return value;
  
  const config = allowRichText ? richTextPurifyConfig : purifyConfig;
  return DOMPurify.sanitize(value, config).trim();
}

/**
 * Recursively sanitize an object
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  richTextFields: string[] = []
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const isRichText = richTextFields.includes(key);
      sanitized[key] = sanitizeString(value, isRichText);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeString(item);
        } else if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item as Record<string, unknown>, richTextFields);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, richTextFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(richTextFields: string[] = []) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, richTextFields);
    }
    next();
  };
}

/**
 * Middleware to sanitize query parameters
 */
export function sanitizeQuery(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      }
    }
  }
  next();
}

/**
 * Middleware to sanitize URL parameters
 */
export function sanitizeParams(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.params && typeof req.params === 'object') {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        (req.params as Record<string, string>)[key] = sanitizeString(value);
      }
    }
  }
  next();
}

// ===== SQL Injection Prevention =====

// Dangerous SQL patterns
const SQL_INJECTION_PATTERNS = [
  /(\s|^)(union|select|insert|update|delete|drop|truncate|alter|exec|execute)(\s|$)/gi,
  /(--)|(\/\*)/g,
  /'.*?'.*?(or|and).*?'.*?'/gi,
  /\b(1=1|1='1'|'1'='1')\b/gi,
];

/**
 * Check for SQL injection patterns
 */
export function hasSqlInjection(value: string): boolean {
  if (typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Middleware to check for SQL injection attempts
 * Note: Primary defense should be parameterized queries
 */
export function checkSqlInjection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const checkValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return hasSqlInjection(value);
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const sources = [req.body, req.query, req.params];
  const hasInjection = sources.some((source) => {
    if (!source || typeof source !== 'object') return false;
    return Object.values(source).some(checkValue);
  });

  if (hasInjection) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid input detected',
        code: 'INVALID_INPUT',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

// ===== File Upload Validation =====

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// Maximum file sizes by type (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024, // 5MB
  'image/png': 5 * 1024 * 1024,
  'image/gif': 5 * 1024 * 1024,
  'image/webp': 5 * 1024 * 1024,
  'application/pdf': 25 * 1024 * 1024, // 25MB
  'application/msword': 25 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 25 * 1024 * 1024,
  'application/vnd.ms-excel': 25 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 25 * 1024 * 1024,
  default: 10 * 1024 * 1024, // 10MB default
};

// Dangerous file extensions
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js',
  '.jar', '.msi', '.dll', '.scr', '.pif', '.com',
]);

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
  originalFilename: z
    .string()
    .min(1)
    .max(255)
    .refine((name) => {
      const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
      return !DANGEROUS_EXTENSIONS.has(ext);
    }, 'File type not allowed'),
  fileSize: z
    .number()
    .positive()
    .max(25 * 1024 * 1024, 'File size exceeds maximum limit'),
  mimeType: z
    .string()
    .refine((type) => ALLOWED_MIME_TYPES.has(type), 'File type not allowed'),
});

/**
 * Validate file upload metadata
 */
export function validateFileUpload(data: {
  originalFilename: string;
  fileSize: number;
  mimeType: string;
}): { valid: boolean; errors?: string[] } {
  const result = fileUploadSchema.safeParse(data);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => e.message),
    };
  }

  // Additional size check based on MIME type
  const maxSize = MAX_FILE_SIZES[data.mimeType] ?? MAX_FILE_SIZES.default;
  if (data.fileSize > maxSize) {
    return {
      valid: false,
      errors: [`File size exceeds ${maxSize / 1024 / 1024}MB limit for this file type`],
    };
  }

  return { valid: true };
}

// ===== HTML Escape for User-Generated Content =====

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities in a string
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Escape HTML in all string values of an object
 */
export function escapeHtmlInObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const escaped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      escaped[key] = escapeHtml(value);
    } else if (Array.isArray(value)) {
      escaped[key] = value.map((item) => {
        if (typeof item === 'string') return escapeHtml(item);
        if (typeof item === 'object' && item !== null) {
          return escapeHtmlInObject(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      escaped[key] = escapeHtmlInObject(value as Record<string, unknown>);
    } else {
      escaped[key] = value;
    }
  }

  return escaped;
}

export default {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  checkSqlInjection,
  validateFileUpload,
  escapeHtml,
  escapeHtmlInObject,
  hasSqlInjection,
};


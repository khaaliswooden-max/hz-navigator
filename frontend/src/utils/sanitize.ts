/**
 * Frontend Input Sanitization Utilities
 * 
 * Provides client-side sanitization for user input.
 * Note: Server-side sanitization is the primary defense;
 * this provides defense-in-depth.
 */

// HTML entities to escape
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
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Sanitize a string by removing potential XSS vectors
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URLs (except common image types)
  sanitized = sanitized.replace(/data:(?!image\/(png|jpg|jpeg|gif|webp))/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Trim whitespace
  return sanitized.trim();
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map((item) => {
        if (typeof item === 'string') return sanitizeString(item);
        if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>
      );
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.toLowerCase().trim();

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';

  // Remove all non-digit characters except + for international
  return phone.replace(/[^\d+]/g, '').substring(0, 20);
}

/**
 * Sanitize file name for upload
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') return '';

  // Remove path components
  const baseName = fileName.split(/[/\\]/).pop() ?? '';

  // Remove dangerous characters
  return baseName
    .replace(/[<>:"|?*]/g, '')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
}

/**
 * Validate file type
 */
export function isAllowedFileType(
  fileName: string,
  allowedTypes: string[] = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return allowedTypes.includes(extension);
}

/**
 * Validate file size
 */
export function isValidFileSize(
  fileSize: number,
  maxSizeMB = 25
): boolean {
  return fileSize > 0 && fileSize <= maxSizeMB * 1024 * 1024;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';

  try {
    const parsed = new URL(url);
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Create a safe innerHTML content (use sparingly)
 */
export function createSafeHtml(content: string, allowedTags: string[] = []): string {
  if (!content) return '';

  let sanitized = content;

  // If no tags allowed, escape everything
  if (allowedTags.length === 0) {
    return escapeHtml(sanitized);
  }

  // Build regex to match only allowed tags
  const tagPattern = allowedTags.join('|');
  const allowedTagRegex = new RegExp(`<(/?(${tagPattern}))(\\s[^>]*)?>`, 'gi');

  // First escape everything
  sanitized = escapeHtml(sanitized);

  // Then restore allowed tags
  sanitized = sanitized.replace(
    new RegExp(`&lt;(/?(${tagPattern}))(\\s[^&]*)?&gt;`, 'gi'),
    (match, tag, tagName, attrs) => {
      // For allowed tags, unescape but sanitize attributes
      const safeAttrs = attrs
        ? attrs
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/on\w+\s*=/gi, 'data-blocked=')
        : '';
      return `<${tag}${safeAttrs}>`;
    }
  );

  return sanitized;
}

export default {
  escapeHtml,
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  isAllowedFileType,
  isValidFileSize,
  sanitizeUrl,
  createSafeHtml,
};


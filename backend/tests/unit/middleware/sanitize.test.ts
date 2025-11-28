/**
 * Sanitization Middleware Unit Tests
 */

import {
  sanitizeString,
  sanitizeObject,
  escapeHtml,
  hasSqlInjection,
  validateFileUpload,
} from '../../../src/middleware/sanitize';

describe('Sanitization Middleware', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should preserve normal text', () => {
      const input = 'Normal text with numbers 123';
      expect(sanitizeString(input)).toBe(input);
    });

    it('should remove event handlers', () => {
      const input = '<img onerror="alert(1)" src="x">';
      const result = sanitizeString(input);
      expect(result).not.toContain('onerror');
    });

    it('should allow rich text when specified', () => {
      const input = '<b>Bold</b> and <i>italic</i>';
      const result = sanitizeString(input, true);
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
    });

    it('should remove dangerous tags even in rich text mode', () => {
      const input = '<b>Bold</b><script>alert(1)</script>';
      const result = sanitizeString(input, true);
      expect(result).toContain('<b>');
      expect(result).not.toContain('<script>');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string fields', () => {
      const input = {
        name: '<script>alert(1)</script>John',
        age: 30,
        email: 'john@example.com',
      };

      const result = sanitizeObject(input);
      
      expect(result.name).not.toContain('<script>');
      expect(result.name).toContain('John');
      expect(result.age).toBe(30);
      expect(result.email).toBe('john@example.com');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          address: {
            street: '<script>hack</script>123 Main',
          },
        },
      };

      const result = sanitizeObject(input);
      
      expect(result.user.name).not.toContain('<b>');
      expect(result.user.address.street).not.toContain('<script>');
      expect(result.user.address.street).toContain('123 Main');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>alert(1)</script>', 'normal', '<b>bold</b>'],
      };

      const result = sanitizeObject(input);
      
      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[1]).toBe('normal');
      expect(result.tags[2]).not.toContain('<b>');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        items: null,
        created: new Date('2024-01-01'),
      };

      const result = sanitizeObject(input as Record<string, unknown>);
      
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.items).toBeNull();
    });

    it('should allow rich text in specified fields', () => {
      const input = {
        title: '<b>Important</b>',
        description: '<b>Description</b>',
      };

      const result = sanitizeObject(input, ['description']);
      
      expect(result.title).not.toContain('<b>');
      expect(result.description).toContain('<b>');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#x27;');
    });

    it('should escape a complete HTML string', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should not modify safe strings', () => {
      const input = 'Hello World 123';
      expect(escapeHtml(input)).toBe(input);
    });
  });

  describe('hasSqlInjection', () => {
    it('should detect SQL keywords', () => {
      expect(hasSqlInjection("SELECT * FROM users")).toBe(true);
      expect(hasSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(hasSqlInjection("1' OR '1'='1")).toBe(true);
      expect(hasSqlInjection("UNION SELECT password FROM users")).toBe(true);
    });

    it('should detect SQL comments', () => {
      expect(hasSqlInjection("admin'--")).toBe(true);
      expect(hasSqlInjection("/* comment */")).toBe(true);
    });

    it('should detect tautologies', () => {
      expect(hasSqlInjection("1=1")).toBe(true);
      expect(hasSqlInjection("'1'='1'")).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(hasSqlInjection("Hello World")).toBe(false);
      expect(hasSqlInjection("john@example.com")).toBe(false);
      expect(hasSqlInjection("My name is John")).toBe(false);
    });

    it('should not flag partial matches', () => {
      // "selection" contains "select" but shouldn't trigger
      expect(hasSqlInjection("natural selection")).toBe(false);
    });

    it('should handle empty string', () => {
      expect(hasSqlInjection("")).toBe(false);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate allowed file types', () => {
      const validPdf = {
        originalFilename: 'document.pdf',
        fileSize: 1024 * 1024, // 1MB
        mimeType: 'application/pdf',
      };

      const result = validateFileUpload(validPdf);
      expect(result.valid).toBe(true);
    });

    it('should reject dangerous file extensions', () => {
      const dangerousFile = {
        originalFilename: 'virus.exe',
        fileSize: 1024,
        mimeType: 'application/octet-stream',
      };

      const result = validateFileUpload(dangerousFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = {
        originalFilename: 'large.pdf',
        fileSize: 50 * 1024 * 1024, // 50MB
        mimeType: 'application/pdf',
      };

      const result = validateFileUpload(largeFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('size'));
    });

    it('should reject invalid MIME types', () => {
      const invalidMime = {
        originalFilename: 'file.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
      };

      const result = validateFileUpload(invalidMime);
      expect(result.valid).toBe(false);
    });

    it('should validate all allowed file types', () => {
      const allowedTypes = [
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'doc', mime: 'application/msword' },
        { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { ext: 'jpg', mime: 'image/jpeg' },
        { ext: 'png', mime: 'image/png' },
      ];

      for (const { ext, mime } of allowedTypes) {
        const result = validateFileUpload({
          originalFilename: `file.${ext}`,
          fileSize: 1024 * 1024,
          mimeType: mime,
        });
        expect(result.valid).toBe(true);
      }
    });

    it('should handle missing required fields', () => {
      const incomplete = {
        originalFilename: '',
        fileSize: 0,
        mimeType: '',
      };

      const result = validateFileUpload(incomplete);
      expect(result.valid).toBe(false);
    });
  });
});


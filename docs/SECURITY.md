# HZ Navigator Security Guide

This document outlines the security measures implemented in the HZ Navigator application.

## Table of Contents

1. [Rate Limiting](#rate-limiting)
2. [Input Sanitization](#input-sanitization)
3. [CORS Configuration](#cors-configuration)
4. [Security Headers](#security-headers)
5. [Database Security](#database-security)
6. [Secrets Management](#secrets-management)
7. [Audit Logging](#audit-logging)
8. [HTTPS Enforcement](#https-enforcement)
9. [Authentication Security](#authentication-security)
10. [Best Practices](#best-practices)

---

## Rate Limiting

Rate limiting protects against brute force attacks and API abuse.

### Configuration

| Endpoint Type | Limit | Window | Purpose |
|---------------|-------|--------|---------|
| Authentication (`/api/auth/*`) | 5 requests | 15 minutes | Prevent brute force attacks |
| API (general) | 100 requests | 15 minutes | Prevent API abuse |
| Document Upload | 10 uploads | 1 hour | Prevent storage abuse |
| Password Reset | 3 requests | 1 hour | Prevent enumeration attacks |
| Admin Endpoints | 50 requests | 15 minutes | Protect admin functions |

### Implementation

```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});
```

### Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": {
    "message": "Too many requests. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 900
  }
}
```

---

## Input Sanitization

All user input is sanitized to prevent XSS and SQL injection attacks.

### XSS Prevention

- All string inputs are sanitized using DOMPurify
- HTML entities are escaped in user-generated content
- Rich text fields have a restricted set of allowed tags

```typescript
// Sanitize user input
import { sanitizeString, escapeHtml } from './middleware/sanitize';

const safeInput = sanitizeString(userInput);
const safeHtml = escapeHtml(userContent);
```

### SQL Injection Prevention

- All database queries use parameterized queries
- Input is checked for SQL injection patterns
- Never construct SQL queries with string concatenation

```typescript
// CORRECT - Parameterized query
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// WRONG - Never do this
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'` // VULNERABLE!
);
```

### File Upload Validation

- Allowed file types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
- Maximum file size: 25MB
- File names are sanitized to remove dangerous characters
- MIME types are validated against file extensions

---

## CORS Configuration

Cross-Origin Resource Sharing is configured with strict origin whitelist.

### Configuration

```typescript
// backend/src/middleware/security.ts
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
```

### Environment Variables

```bash
# Single origin
CORS_ORIGIN=https://app.hz-navigator.com

# Multiple origins
CORS_ORIGINS=https://app.hz-navigator.com,https://admin.hz-navigator.com
```

### Rules

- No wildcard (`*`) in production
- Credentials are allowed for authenticated requests
- Preflight responses are cached for 24 hours

---

## Security Headers

Security headers are implemented using Helmet middleware.

### Implemented Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Strict directives | Prevent XSS, injection attacks |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer information |
| Permissions-Policy | Restricted features | Disable unnecessary browser features |
| Strict-Transport-Security | max-age=31536000 | Enforce HTTPS (production) |

### Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https://*.amazonaws.com;
connect-src 'self' https://api.mapbox.com https://*.amazonaws.com;
frame-ancestors 'none';
```

---

## Database Security

### Row-Level Security (RLS)

Multi-tenant data isolation is enforced at the database level.

```sql
-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create isolation policy
CREATE POLICY businesses_isolation ON businesses
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR current_setting('app.current_user_role') IN ('admin', 'reviewer')
  );
```

### Setting RLS Context

```typescript
// Set context before queries
await db.query(`SELECT set_rls_context($1, $2)`, [userId, userRole]);
```

### Encrypted Fields

Sensitive data is encrypted at rest using AES-256-GCM:

- Social Security Numbers (SSN)
- Tax IDs (EIN)
- Bank account numbers

```typescript
import { encryptionService } from './services/encryptionService';

// Encrypt before storing
const encryptedSsn = encryptionService.encrypt(ssn);

// Decrypt when needed
const decryptedSsn = encryptionService.decrypt(encryptedSsn);

// Mask for display
const maskedSsn = encryptionService.mask(ssn, 'ssn'); // ***-**-1234
```

### Database User Permissions

Use least-privilege principle:

```sql
-- Application user has limited permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO hz_app_user;
GRANT SELECT ON hubzones TO hz_app_user; -- Read-only for reference data
```

---

## Secrets Management

### Environment Variables

- **Development**: Use `.env` file (never commit to git)
- **Production**: Use AWS Secrets Manager

### Required Secrets

| Secret | Purpose | Rotation |
|--------|---------|----------|
| JWT_SECRET | Sign authentication tokens | Quarterly |
| ENCRYPTION_KEY | Encrypt sensitive data | Annually |
| POSTGRES_PASSWORD | Database authentication | Quarterly |

### Generating Secrets

```bash
# Generate JWT secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Secret Rotation

1. Generate new secret
2. Update in AWS Secrets Manager
3. Deploy with new secret
4. Log rotation in `secret_rotations` table

---

## Audit Logging

All security-relevant events are logged for compliance and forensics.

### Logged Events

| Category | Events |
|----------|--------|
| Authentication | Login success/failure, logout, password changes |
| Data Access | Document views, downloads, exports |
| Data Changes | Create, update, delete operations |
| Security | Rate limiting, permission denied, suspicious activity |
| Admin | Configuration changes, user impersonation |

### Log Structure

```typescript
{
  id: "uuid",
  userId: "user-uuid",
  action: "AUTH_LOGIN_SUCCESS",
  entityType: "user",
  entityId: "target-uuid",
  description: "User logged in successfully",
  metadata: { email: "user@example.com" },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  severity: "low",
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Retention

- Audit logs are retained for **1 year**
- Cleanup script: `npm run audit:cleanup`
- Failed login attempts: 30 days

### Querying Audit Logs

```typescript
import { auditService } from './services/auditService';

const logs = await auditService.query({
  userId: 'user-uuid',
  action: ['AUTH_LOGIN_FAILED'],
  severity: ['high', 'critical'],
  startDate: new Date('2024-01-01'),
  limit: 100,
});
```

---

## HTTPS Enforcement

### Production Requirements

- All traffic must use HTTPS
- HTTP requests are redirected to HTTPS (301)
- TLS 1.3 recommended (minimum TLS 1.2)
- HSTS header enforces HTTPS for 1 year

### HSTS Configuration

```typescript
hsts: {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
}
```

### SSL Certificate

- Use valid certificate from trusted CA
- Renew certificates before expiration
- Consider using Let's Encrypt for automatic renewal

---

## Authentication Security

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Account Lockout

- 5 failed attempts in 15 minutes triggers lockout
- Lockout duration: 15 minutes
- Failed attempts are logged

### JWT Tokens

- Access tokens expire in 7 days
- Refresh tokens expire in 30 days
- Tokens include: userId, email, role
- Tokens are signed with HS256 algorithm

---

## Best Practices

### For Developers

1. **Never trust user input** - Always sanitize and validate
2. **Use parameterized queries** - Never concatenate SQL
3. **Log security events** - Use the audit service
4. **Handle errors gracefully** - Don't expose stack traces in production
5. **Keep dependencies updated** - Run `npm audit` regularly

### For Deployment

1. **Use environment variables** for secrets
2. **Enable all security middleware** in production
3. **Configure proper CORS origins**
4. **Use HTTPS everywhere**
5. **Set up monitoring** for security events

### Security Checklist

- [ ] All secrets are in environment variables
- [ ] CORS is configured with specific origins
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] Security headers are set
- [ ] Audit logging is enabled
- [ ] Database uses RLS policies
- [ ] Passwords meet complexity requirements
- [ ] JWT secrets are unique per environment
- [ ] File uploads are validated

---

## Incident Response

### If a Security Incident Occurs

1. **Assess** - Determine scope and severity
2. **Contain** - Isolate affected systems
3. **Eradicate** - Remove the threat
4. **Recover** - Restore normal operations
5. **Document** - Record lessons learned

### Security Contacts

- Security Team: security@hz-navigator.com
- On-Call: Check PagerDuty

---

## Compliance

This application is designed to support compliance with:

- SOC 2 Type II
- NIST 800-53
- OWASP Top 10

Regular security assessments and penetration testing are recommended.


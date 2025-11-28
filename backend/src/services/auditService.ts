/**
 * Audit Logging Service
 * 
 * Comprehensive audit logging for:
 * - Authentication attempts (login, logout, failed attempts)
 * - Sensitive operations (data access, modifications)
 * - API errors
 * - Security events
 * 
 * Logs are stored in a separate audit_logs table with 1-year retention.
 */

import { db } from './database.js';

import type { Request } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// ===== Types =====

export type AuditAction =
  // Authentication
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_PASSWORD_RESET_REQUEST'
  | 'AUTH_PASSWORD_RESET_SUCCESS'
  | 'AUTH_PASSWORD_CHANGE'
  | 'AUTH_MFA_ENABLED'
  | 'AUTH_MFA_DISABLED'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_ACCOUNT_UNLOCKED'
  // User Management
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_EMAIL_VERIFIED'
  // Business Operations
  | 'BUSINESS_CREATED'
  | 'BUSINESS_UPDATED'
  | 'BUSINESS_DELETED'
  | 'BUSINESS_VERIFIED'
  // Certification Operations
  | 'CERTIFICATION_SUBMITTED'
  | 'CERTIFICATION_APPROVED'
  | 'CERTIFICATION_DENIED'
  | 'CERTIFICATION_REVOKED'
  | 'CERTIFICATION_RENEWED'
  // Document Operations
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_SHARED'
  // Data Access
  | 'DATA_EXPORT'
  | 'DATA_BULK_ACCESS'
  | 'SENSITIVE_DATA_ACCESS'
  | 'PII_ACCESS'
  // Admin Operations
  | 'ADMIN_CONFIG_CHANGED'
  | 'ADMIN_USER_IMPERSONATED'
  | 'ADMIN_SYSTEM_MODIFIED'
  | 'ADMIN_JOB_TRIGGERED'
  // Security Events
  | 'SECURITY_RATE_LIMITED'
  | 'SECURITY_SUSPICIOUS_ACTIVITY'
  | 'SECURITY_PERMISSION_DENIED'
  | 'SECURITY_INVALID_TOKEN'
  // API Errors
  | 'API_ERROR'
  | 'API_VALIDATION_ERROR';

export type AuditEntityType =
  | 'user'
  | 'business'
  | 'certification'
  | 'document'
  | 'hubzone'
  | 'contract'
  | 'system'
  | 'api';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
  severity: AuditSeverity;
  timestamp?: Date;
}

export interface AuditQueryFilters {
  userId?: string;
  action?: AuditAction | AuditAction[];
  entityType?: AuditEntityType;
  entityId?: string;
  severity?: AuditSeverity | AuditSeverity[];
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ===== Severity Mapping =====

const ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  // Low severity - routine operations
  AUTH_LOGIN_SUCCESS: 'low',
  AUTH_LOGOUT: 'low',
  AUTH_TOKEN_REFRESH: 'low',
  DOCUMENT_VIEWED: 'low',
  
  // Medium severity - notable operations
  AUTH_LOGIN_FAILED: 'medium',
  AUTH_PASSWORD_CHANGE: 'medium',
  USER_UPDATED: 'medium',
  BUSINESS_CREATED: 'medium',
  BUSINESS_UPDATED: 'medium',
  DOCUMENT_UPLOADED: 'medium',
  DOCUMENT_DOWNLOADED: 'medium',
  DOCUMENT_DELETED: 'medium',
  CERTIFICATION_SUBMITTED: 'medium',
  API_VALIDATION_ERROR: 'medium',
  
  // High severity - significant operations
  AUTH_PASSWORD_RESET_REQUEST: 'high',
  AUTH_PASSWORD_RESET_SUCCESS: 'high',
  AUTH_MFA_ENABLED: 'high',
  AUTH_MFA_DISABLED: 'high',
  USER_CREATED: 'high',
  USER_DELETED: 'high',
  USER_ROLE_CHANGED: 'high',
  BUSINESS_DELETED: 'high',
  BUSINESS_VERIFIED: 'high',
  CERTIFICATION_APPROVED: 'high',
  CERTIFICATION_DENIED: 'high',
  CERTIFICATION_REVOKED: 'high',
  CERTIFICATION_RENEWED: 'high',
  DOCUMENT_SHARED: 'high',
  DATA_EXPORT: 'high',
  DATA_BULK_ACCESS: 'high',
  SENSITIVE_DATA_ACCESS: 'high',
  PII_ACCESS: 'high',
  ADMIN_CONFIG_CHANGED: 'high',
  ADMIN_JOB_TRIGGERED: 'high',
  API_ERROR: 'high',
  USER_EMAIL_VERIFIED: 'high',
  
  // Critical severity - security events
  AUTH_ACCOUNT_LOCKED: 'critical',
  AUTH_ACCOUNT_UNLOCKED: 'critical',
  ADMIN_USER_IMPERSONATED: 'critical',
  ADMIN_SYSTEM_MODIFIED: 'critical',
  SECURITY_RATE_LIMITED: 'critical',
  SECURITY_SUSPICIOUS_ACTIVITY: 'critical',
  SECURITY_PERMISSION_DENIED: 'critical',
  SECURITY_INVALID_TOKEN: 'critical',
};

// ===== Helper Functions =====

function extractRequestInfo(req: Request | AuthenticatedRequest): Partial<AuditLogEntry> {
  const authReq = req as AuthenticatedRequest;
  
  return {
    userId: authReq.user?.userId,
    ipAddress: (req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for']) as string,
    userAgent: req.headers['user-agent'],
    requestId: (req as Request & { requestId?: string }).requestId,
    requestMethod: req.method,
    requestPath: req.path,
    sessionId: req.headers['x-session-id'] as string,
  };
}

// ===== Audit Service =====

export const auditService = {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<string> {
    const severity = entry.severity || ACTION_SEVERITY[entry.action] || 'medium';

    const query = `
      INSERT INTO audit_logs (
        user_id, session_id, action, entity_type, entity_id,
        description, old_values, new_values, metadata,
        ip_address, user_agent, request_id, request_method, request_path,
        response_status, severity, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
      ) RETURNING id
    `;

    const values = [
      entry.userId || null,
      entry.sessionId || null,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.description || null,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.requestId || null,
      entry.requestMethod || null,
      entry.requestPath || null,
      entry.responseStatus || null,
      severity,
    ];

    try {
      const result = await db.query<{ id: string }>(query, values);
      return result.rows[0].id;
    } catch (error) {
      // Log to console if database insert fails (don't throw to avoid breaking main flow)
      console.error('[AUDIT] Failed to log audit event:', error, entry);
      throw error;
    }
  },

  /**
   * Log authentication event
   */
  async logAuth(
    action: AuditAction,
    req: Request | AuthenticatedRequest,
    details?: {
      userId?: string;
      email?: string;
      success?: boolean;
      reason?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const requestInfo = extractRequestInfo(req);

    await this.log({
      ...requestInfo,
      userId: details?.userId || requestInfo.userId,
      action,
      entityType: 'user',
      entityId: details?.userId,
      description: details?.reason,
      metadata: {
        email: details?.email,
        success: details?.success,
        ...details?.metadata,
      },
      severity: ACTION_SEVERITY[action],
    });
  },

  /**
   * Log data access event
   */
  async logDataAccess(
    action: AuditAction,
    req: Request | AuthenticatedRequest,
    entityType: AuditEntityType,
    entityId: string,
    details?: {
      description?: string;
      accessedFields?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const requestInfo = extractRequestInfo(req);

    await this.log({
      ...requestInfo,
      action,
      entityType,
      entityId,
      description: details?.description,
      metadata: {
        accessedFields: details?.accessedFields,
        ...details?.metadata,
      },
      severity: ACTION_SEVERITY[action],
    });
  },

  /**
   * Log data modification event
   */
  async logDataChange(
    action: AuditAction,
    req: Request | AuthenticatedRequest,
    entityType: AuditEntityType,
    entityId: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    description?: string
  ): Promise<void> {
    const requestInfo = extractRequestInfo(req);

    await this.log({
      ...requestInfo,
      action,
      entityType,
      entityId,
      description,
      oldValues: oldValues || undefined,
      newValues: newValues || undefined,
      severity: ACTION_SEVERITY[action],
    });
  },

  /**
   * Log security event
   */
  async logSecurityEvent(
    action: AuditAction,
    req: Request | AuthenticatedRequest,
    details: {
      description: string;
      metadata?: Record<string, unknown>;
      entityType?: AuditEntityType;
      entityId?: string;
    }
  ): Promise<void> {
    const requestInfo = extractRequestInfo(req);

    await this.log({
      ...requestInfo,
      action,
      entityType: details.entityType || 'system',
      entityId: details.entityId,
      description: details.description,
      metadata: details.metadata,
      severity: ACTION_SEVERITY[action],
    });
  },

  /**
   * Log API error
   */
  async logApiError(
    req: Request | AuthenticatedRequest,
    error: Error,
    statusCode: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    const requestInfo = extractRequestInfo(req);

    await this.log({
      ...requestInfo,
      action: 'API_ERROR',
      entityType: 'api',
      description: error.message,
      responseStatus: statusCode,
      metadata: {
        errorName: error.name,
        stack: process.env['NODE_ENV'] === 'development' ? error.stack : undefined,
        ...details,
      },
      severity: statusCode >= 500 ? 'high' : 'medium',
    });
  },

  /**
   * Query audit logs
   */
  async query(filters: AuditQueryFilters): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.userId);
    }

    if (filters.action) {
      if (Array.isArray(filters.action)) {
        conditions.push(`action = ANY($${paramIndex++})`);
        values.push(filters.action);
      } else {
        conditions.push(`action = $${paramIndex++}`);
        values.push(filters.action);
      }
    }

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }

    if (filters.entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      values.push(filters.entityId);
    }

    if (filters.severity) {
      if (Array.isArray(filters.severity)) {
        conditions.push(`severity = ANY($${paramIndex++})`);
        values.push(filters.severity);
      } else {
        conditions.push(`severity = $${paramIndex++}`);
        values.push(filters.severity);
      }
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    if (filters.ipAddress) {
      conditions.push(`ip_address = $${paramIndex++}`);
      values.push(filters.ipAddress);
    }

    if (filters.search) {
      conditions.push(`(description ILIKE $${paramIndex} OR action ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countResult = await db.query<{ count: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get logs
    const dataQuery = `
      SELECT 
        id, user_id as "userId", session_id as "sessionId", action,
        entity_type as "entityType", entity_id as "entityId",
        description, old_values as "oldValues", new_values as "newValues",
        metadata, ip_address as "ipAddress", user_agent as "userAgent",
        request_id as "requestId", request_method as "requestMethod",
        request_path as "requestPath", response_status as "responseStatus",
        severity, created_at as "timestamp"
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    values.push(limit, offset);

    const result = await db.query<AuditLogEntry>(dataQuery, values);

    return {
      logs: result.rows,
      total,
      page,
      limit,
    };
  },

  /**
   * Clean up old audit logs (retention policy)
   * Default: Keep logs for 1 year
   */
  async cleanupOldLogs(retentionDays = 365): Promise<number> {
    const query = `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      RETURNING id
    `;

    const result = await db.query(query);
    return result.rowCount ?? 0;
  },

  /**
   * Get audit statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    bySeverity: Record<AuditSeverity, number>;
    byAction: Record<string, number>;
    byEntityType: Record<string, number>;
    recentCritical: AuditLogEntry[];
  }> {
    const dateCondition = startDate && endDate
      ? `WHERE created_at BETWEEN $1 AND $2`
      : '';
    const dateValues = startDate && endDate ? [startDate, endDate] : [];

    // Total count
    const totalQuery = `SELECT COUNT(*) FROM audit_logs ${dateCondition}`;
    const totalResult = await db.query<{ count: string }>(totalQuery, dateValues);

    // By severity
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM audit_logs ${dateCondition}
      GROUP BY severity
    `;
    const severityResult = await db.query<{ severity: AuditSeverity; count: string }>(
      severityQuery,
      dateValues
    );

    // By action (top 10)
    const actionQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_logs ${dateCondition}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;
    const actionResult = await db.query<{ action: string; count: string }>(
      actionQuery,
      dateValues
    );

    // By entity type
    const entityQuery = `
      SELECT entity_type, COUNT(*) as count
      FROM audit_logs ${dateCondition}
      GROUP BY entity_type
    `;
    const entityResult = await db.query<{ entity_type: string; count: string }>(
      entityQuery,
      dateValues
    );

    // Recent critical events
    const criticalQuery = `
      SELECT 
        id, user_id as "userId", action, entity_type as "entityType",
        description, ip_address as "ipAddress", created_at as "timestamp"
      FROM audit_logs
      WHERE severity = 'critical'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const criticalResult = await db.query<AuditLogEntry>(criticalQuery);

    return {
      totalLogs: parseInt(totalResult.rows[0].count, 10),
      bySeverity: severityResult.rows.reduce(
        (acc, row) => ({ ...acc, [row.severity]: parseInt(row.count, 10) }),
        { low: 0, medium: 0, high: 0, critical: 0 }
      ),
      byAction: actionResult.rows.reduce(
        (acc, row) => ({ ...acc, [row.action]: parseInt(row.count, 10) }),
        {}
      ),
      byEntityType: entityResult.rows.reduce(
        (acc, row) => ({ ...acc, [row.entity_type]: parseInt(row.count, 10) }),
        {}
      ),
      recentCritical: criticalResult.rows,
    };
  },
};

export default auditService;


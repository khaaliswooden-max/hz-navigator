/**
 * Admin Panel Types
 */

// ===== User Management =====
export type UserRole = 'user' | 'admin' | 'reviewer' | 'agency';
export type UserStatus = 'active' | 'suspended' | 'pending' | 'disabled';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  businessCount: number;
  ipAddress?: string;
}

export interface UserFilters {
  search?: string;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface UserUpdateData {
  role?: UserRole;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
}

// ===== Business Management =====
export type CertificationStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'suspended';

export interface AdminBusiness {
  id: string;
  name: string;
  ueiNumber: string;
  ein: string;
  ownerName: string;
  ownerEmail: string;
  certificationStatus: CertificationStatus;
  certificationDate: string | null;
  expirationDate: string | null;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  employeeCount: number;
  hubzoneResidencyRate: number;
  createdAt: string;
  lastUpdated: string;
}

export interface BusinessFilters {
  search?: string;
  certificationStatus?: CertificationStatus | 'all';
  riskLevel?: string | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'complianceScore' | 'certificationDate';
  sortOrder?: 'asc' | 'desc';
}

export interface CertificationAction {
  businessId: string;
  action: 'approve' | 'deny' | 'suspend' | 'reinstate';
  reason?: string;
  notes?: string;
  expirationDate?: string;
}

export interface ComplianceOverride {
  businessId: string;
  field: 'residencyRate' | 'principalOffice' | 'ownership';
  value: number | boolean;
  reason: string;
  expiresAt?: string;
}

// ===== System Configuration =====
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  rolloutPercentage?: number;
  enabledForRoles?: UserRole[];
}

export interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceEndTime?: string;
  rateLimits: {
    auth: number;
    api: number;
    upload: number;
    admin: number;
  };
  emailTemplates: EmailTemplate[];
  environmentVariables: EnvironmentVariable[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  lastUpdated: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
  description?: string;
}

// ===== Analytics =====
export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  certifiedBusinesses: number;
  pendingCertifications: number;
  averageComplianceScore: number;
}

export interface GrowthData {
  date: string;
  users: number;
  businesses: number;
  certifications: number;
}

export interface ApiUsageMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  requestsByEndpoint: {
    endpoint: string;
    count: number;
    avgTime: number;
    errorRate: number;
  }[];
  requestsByHour: {
    hour: number;
    count: number;
  }[];
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  errorTrend: {
    date: string;
    count: number;
  }[];
}

// ===== System Jobs =====
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SystemJob {
  id: string;
  name: string;
  type: 'scheduled' | 'manual' | 'triggered';
  status: JobStatus;
  progress?: number;
  startedAt: string | null;
  completedAt: string | null;
  nextRun: string | null;
  cronExpression?: string;
  result?: {
    success: boolean;
    message?: string;
    recordsProcessed?: number;
    errors?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface JobQueue {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  jobs: SystemJob[];
}

// ===== Audit Logs =====
export type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.password_reset'
  | 'user.role_changed'
  | 'business.created'
  | 'business.updated'
  | 'business.deleted'
  | 'certification.approved'
  | 'certification.denied'
  | 'certification.suspended'
  | 'compliance.override'
  | 'document.uploaded'
  | 'document.deleted'
  | 'admin.config_changed'
  | 'admin.job_triggered'
  | 'system.maintenance_enabled'
  | 'system.maintenance_disabled';

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string | null;
  userEmail: string | null;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
}

export interface AuditLogFilters {
  action?: AuditAction | 'all';
  userId?: string;
  userEmail?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

// ===== Security =====
export interface SecuritySettings {
  twoFactorRequired: boolean;
  ipWhitelist: string[];
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expirationDays: number;
  };
}

export interface AdminSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  isCurrent: boolean;
}

// ===== Activity Feed =====
export interface ActivityItem {
  id: string;
  type: 'user' | 'business' | 'certification' | 'system' | 'security';
  action: string;
  description: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ===== API Response Types =====
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminDashboardData {
  stats: PlatformStats;
  usersByRole: { role: string; count: number }[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    responseTime: number;
    errorRate: number;
    lastIncident?: string;
  };
  mapUpdateStatus: {
    lastUpdate: string;
    nextScheduled: string;
    status: 'completed' | 'running' | 'failed';
    zonesUpdated: number;
  };
  recentActivity: ActivityItem[];
  activeAlerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}


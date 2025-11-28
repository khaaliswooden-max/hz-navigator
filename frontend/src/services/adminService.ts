/**
 * Admin Service
 * API calls for admin panel functionality
 */

import { apiClient } from './api';
import type {
  AdminUser,
  UserFilters,
  UserUpdateData,
  AdminBusiness,
  BusinessFilters,
  CertificationAction,
  ComplianceOverride,
  FeatureFlag,
  SystemConfig,
  EmailTemplate,
  PlatformStats,
  GrowthData,
  ApiUsageMetrics,
  ErrorMetrics,
  SystemJob,
  JobQueue,
  AuditLog,
  AuditLogFilters,
  SecuritySettings,
  AdminSession,
  ActivityItem,
  PaginatedResponse,
  AdminDashboardData,
} from '../types/admin';

// ===== Dashboard =====
export async function getDashboardData(): Promise<AdminDashboardData> {
  return apiClient.get<{ data: AdminDashboardData }>('/v1/admin/dashboard').then(res => res.data);
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return apiClient.get<{ data: PlatformStats }>('/v1/admin/stats').then(res => res.data);
}

export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  return apiClient.get<{ data: ActivityItem[] }>(`/v1/admin/activity?limit=${limit}`).then(res => res.data);
}

// ===== User Management =====
export async function getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<AdminUser>> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.role && filters.role !== 'all') params.append('role', filters.role);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  return apiClient.get<PaginatedResponse<AdminUser>>(`/v1/admin/users?${params.toString()}`);
}

export async function getUser(userId: string): Promise<AdminUser> {
  return apiClient.get<{ data: AdminUser }>(`/v1/admin/users/${userId}`).then(res => res.data);
}

export async function updateUser(userId: string, data: UserUpdateData): Promise<AdminUser> {
  return apiClient.put<{ data: AdminUser }>(`/v1/admin/users/${userId}`, data).then(res => res.data);
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  return apiClient.post(`/v1/admin/users/${userId}/suspend`, { reason });
}

export async function activateUser(userId: string): Promise<void> {
  return apiClient.post(`/v1/admin/users/${userId}/activate`);
}

export async function resetUserPassword(userId: string): Promise<{ tempPassword?: string }> {
  return apiClient.post<{ data: { tempPassword?: string } }>(`/v1/admin/users/${userId}/reset-password`).then(res => res.data);
}

export async function deleteUser(userId: string): Promise<void> {
  return apiClient.delete(`/v1/admin/users/${userId}`);
}

export async function getUserSessions(userId: string): Promise<AdminSession[]> {
  return apiClient.get<{ data: AdminSession[] }>(`/v1/admin/users/${userId}/sessions`).then(res => res.data);
}

export async function terminateSession(sessionId: string): Promise<void> {
  return apiClient.delete(`/v1/admin/sessions/${sessionId}`);
}

// ===== Business Management =====
export async function getBusinesses(filters: BusinessFilters = {}): Promise<PaginatedResponse<AdminBusiness>> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.certificationStatus && filters.certificationStatus !== 'all') {
    params.append('certificationStatus', filters.certificationStatus);
  }
  if (filters.riskLevel && filters.riskLevel !== 'all') params.append('riskLevel', filters.riskLevel);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  return apiClient.get<PaginatedResponse<AdminBusiness>>(`/v1/admin/businesses?${params.toString()}`);
}

export async function getBusiness(businessId: string): Promise<AdminBusiness> {
  return apiClient.get<{ data: AdminBusiness }>(`/v1/admin/businesses/${businessId}`).then(res => res.data);
}

export async function processCertification(action: CertificationAction): Promise<AdminBusiness> {
  return apiClient.post<{ data: AdminBusiness }>('/v1/admin/certifications/process', action).then(res => res.data);
}

export async function setComplianceOverride(override: ComplianceOverride): Promise<void> {
  return apiClient.post('/v1/admin/compliance/override', override);
}

export async function removeComplianceOverride(businessId: string, field: string): Promise<void> {
  return apiClient.delete(`/v1/admin/compliance/override/${businessId}/${field}`);
}

export async function getBusinessAuditLogs(businessId: string, page = 1, limit = 50): Promise<PaginatedResponse<AuditLog>> {
  return apiClient.get<PaginatedResponse<AuditLog>>(`/v1/admin/businesses/${businessId}/audit-logs?page=${page}&limit=${limit}`);
}

export async function bulkUpdateBusinesses(businessIds: string[], action: string, data?: Record<string, unknown>): Promise<{ processed: number; failed: number }> {
  return apiClient.post<{ data: { processed: number; failed: number } }>('/v1/admin/businesses/bulk', {
    businessIds,
    action,
    data,
  }).then(res => res.data);
}

// ===== System Configuration =====
export async function getSystemConfig(): Promise<SystemConfig> {
  return apiClient.get<{ data: SystemConfig }>('/v1/admin/config').then(res => res.data);
}

export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
  return apiClient.put<{ data: SystemConfig }>('/v1/admin/config', config).then(res => res.data);
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  return apiClient.get<{ data: FeatureFlag[] }>('/v1/admin/feature-flags').then(res => res.data);
}

export async function updateFeatureFlag(flagId: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
  return apiClient.put<{ data: FeatureFlag }>(`/v1/admin/feature-flags/${flagId}`, data).then(res => res.data);
}

export async function createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
  return apiClient.post<{ data: FeatureFlag }>('/v1/admin/feature-flags', flag).then(res => res.data);
}

export async function deleteFeatureFlag(flagId: string): Promise<void> {
  return apiClient.delete(`/v1/admin/feature-flags/${flagId}`);
}

export async function toggleMaintenanceMode(enabled: boolean, message?: string, endTime?: string): Promise<void> {
  return apiClient.post('/v1/admin/maintenance', { enabled, message, endTime });
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  return apiClient.get<{ data: EmailTemplate[] }>('/v1/admin/email-templates').then(res => res.data);
}

export async function updateEmailTemplate(templateId: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  return apiClient.put<{ data: EmailTemplate }>(`/v1/admin/email-templates/${templateId}`, data).then(res => res.data);
}

export async function previewEmailTemplate(templateId: string, sampleData: Record<string, string>): Promise<{ html: string; subject: string }> {
  return apiClient.post<{ data: { html: string; subject: string } }>(`/v1/admin/email-templates/${templateId}/preview`, sampleData).then(res => res.data);
}

export async function updateRateLimits(limits: SystemConfig['rateLimits']): Promise<void> {
  return apiClient.put('/v1/admin/config/rate-limits', limits);
}

// ===== Analytics =====
export async function getGrowthData(startDate: string, endDate: string): Promise<GrowthData[]> {
  return apiClient.get<{ data: GrowthData[] }>(`/v1/admin/analytics/growth?startDate=${startDate}&endDate=${endDate}`).then(res => res.data);
}

export async function getApiUsageMetrics(period: 'day' | 'week' | 'month' = 'day'): Promise<ApiUsageMetrics> {
  return apiClient.get<{ data: ApiUsageMetrics }>(`/v1/admin/analytics/api-usage?period=${period}`).then(res => res.data);
}

export async function getErrorMetrics(period: 'day' | 'week' | 'month' = 'day'): Promise<ErrorMetrics> {
  return apiClient.get<{ data: ErrorMetrics }>(`/v1/admin/analytics/errors?period=${period}`).then(res => res.data);
}

export async function getPopularFeatures(): Promise<{ feature: string; usage: number; trend: number }[]> {
  return apiClient.get<{ data: { feature: string; usage: number; trend: number }[] }>('/v1/admin/analytics/features').then(res => res.data);
}

// ===== System Jobs =====
export async function getJobQueue(): Promise<JobQueue> {
  return apiClient.get<{ data: JobQueue }>('/v1/admin/jobs/queue').then(res => res.data);
}

export async function getJobs(status?: string, page = 1, limit = 20): Promise<PaginatedResponse<SystemJob>> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  return apiClient.get<PaginatedResponse<SystemJob>>(`/v1/admin/jobs?${params.toString()}`);
}

export async function getJob(jobId: string): Promise<SystemJob> {
  return apiClient.get<{ data: SystemJob }>(`/v1/admin/jobs/${jobId}`).then(res => res.data);
}

export async function retryJob(jobId: string): Promise<SystemJob> {
  return apiClient.post<{ data: SystemJob }>(`/v1/admin/jobs/${jobId}/retry`).then(res => res.data);
}

export async function cancelJob(jobId: string): Promise<void> {
  return apiClient.post(`/v1/admin/jobs/${jobId}/cancel`);
}

export async function scheduleJob(jobType: string, scheduledAt: string, params?: Record<string, unknown>): Promise<SystemJob> {
  return apiClient.post<{ data: SystemJob }>('/v1/admin/jobs/schedule', {
    type: jobType,
    scheduledAt,
    params,
  }).then(res => res.data);
}

export async function triggerMapUpdate(dryRun = false): Promise<SystemJob> {
  return apiClient.post<{ data: SystemJob }>('/v1/admin/hubzone/update-map', { dry_run: dryRun }).then(res => res.data);
}

export async function getJobHistory(page = 1, limit = 50): Promise<PaginatedResponse<SystemJob>> {
  return apiClient.get<PaginatedResponse<SystemJob>>(`/v1/admin/jobs/history?page=${page}&limit=${limit}`);
}

// ===== Audit Logs =====
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
  const params = new URLSearchParams();
  if (filters.action && filters.action !== 'all') params.append('action', filters.action);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.userEmail) params.append('userEmail', filters.userEmail);
  if (filters.targetType) params.append('targetType', filters.targetType);
  if (filters.targetId) params.append('targetId', filters.targetId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.success !== undefined) params.append('success', filters.success.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  return apiClient.get<PaginatedResponse<AuditLog>>(`/v1/admin/audit-logs?${params.toString()}`);
}

export async function exportAuditLogs(filters: AuditLogFilters, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.action && filters.action !== 'all') params.append('action', filters.action);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  params.append('format', format);

  const response = await fetch(`/api/v1/admin/audit-logs/export?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });
  return response.blob();
}

// ===== Security =====
export async function getSecuritySettings(): Promise<SecuritySettings> {
  return apiClient.get<{ data: SecuritySettings }>('/v1/admin/security').then(res => res.data);
}

export async function updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
  return apiClient.put<{ data: SecuritySettings }>('/v1/admin/security', settings).then(res => res.data);
}

export async function addIpToWhitelist(ip: string, description?: string): Promise<void> {
  return apiClient.post('/v1/admin/security/ip-whitelist', { ip, description });
}

export async function removeIpFromWhitelist(ip: string): Promise<void> {
  return apiClient.delete(`/v1/admin/security/ip-whitelist/${encodeURIComponent(ip)}`);
}

export async function getActiveSessions(): Promise<AdminSession[]> {
  return apiClient.get<{ data: AdminSession[] }>('/v1/admin/sessions').then(res => res.data);
}

export async function terminateAllSessions(userId: string): Promise<void> {
  return apiClient.post(`/v1/admin/users/${userId}/terminate-sessions`);
}

// ===== System Health =====
export async function getSystemHealth(): Promise<AdminDashboardData['systemHealth']> {
  return apiClient.get<{ data: AdminDashboardData['systemHealth'] }>('/v1/admin/system/health').then(res => res.data);
}

export async function getMapUpdateStatus(): Promise<AdminDashboardData['mapUpdateStatus']> {
  return apiClient.get<{ data: AdminDashboardData['mapUpdateStatus'] }>('/v1/admin/hubzone/update-status').then(res => res.data);
}

export default {
  getDashboardData,
  getPlatformStats,
  getRecentActivity,
  getUsers,
  getUser,
  updateUser,
  suspendUser,
  activateUser,
  resetUserPassword,
  deleteUser,
  getBusinesses,
  getBusiness,
  processCertification,
  setComplianceOverride,
  getSystemConfig,
  updateSystemConfig,
  getFeatureFlags,
  updateFeatureFlag,
  getGrowthData,
  getApiUsageMetrics,
  getErrorMetrics,
  getJobQueue,
  getJobs,
  retryJob,
  cancelJob,
  scheduleJob,
  getAuditLogs,
  exportAuditLogs,
  getSecuritySettings,
  updateSecuritySettings,
  getSystemHealth,
  triggerMapUpdate,
};


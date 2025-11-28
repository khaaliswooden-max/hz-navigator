/**
 * Audit Logs Page
 * View all system actions, filter by user/action/date, export logs
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AuditLog, AuditAction, AuditLogFilters } from '../../types/admin';

// Mock data
const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    action: 'user.login',
    userId: 'user-001',
    userEmail: 'john.doe@example.com',
    targetType: 'user',
    targetId: 'user-001',
    details: { ip: '192.168.1.100', userAgent: 'Chrome/120.0', method: 'password' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    success: true,
  },
  {
    id: '2',
    action: 'certification.approved',
    userId: 'user-002',
    userEmail: 'sarah.m@agency.gov',
    targetType: 'business',
    targetId: 'business-001',
    details: { businessName: 'ABC Federal Solutions', reason: 'Met all requirements', expirationDate: '2027-01-20' },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    success: true,
  },
  {
    id: '3',
    action: 'user.password_reset',
    userId: 'user-003',
    userEmail: 'jane.smith@business.com',
    targetType: 'user',
    targetId: 'user-003',
    details: { method: 'email_link' },
    ipAddress: '172.16.0.25',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/605.1',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    success: true,
  },
  {
    id: '4',
    action: 'admin.config_changed',
    userId: 'user-004',
    userEmail: 'admin@hznavigator.com',
    targetType: 'system',
    targetId: null,
    details: { setting: 'rate_limit_auth', oldValue: 10, newValue: 15 },
    ipAddress: '10.0.0.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    success: true,
  },
  {
    id: '5',
    action: 'user.login',
    userId: null,
    userEmail: 'unknown@example.com',
    targetType: 'user',
    targetId: null,
    details: { ip: '185.220.101.1', reason: 'Invalid credentials' },
    ipAddress: '185.220.101.1',
    userAgent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) Chrome/119.0',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    success: false,
  },
  {
    id: '6',
    action: 'document.uploaded',
    userId: 'user-005',
    userEmail: 'bob.wilson@company.net',
    targetType: 'document',
    targetId: 'doc-123',
    details: { filename: 'annual_report_2023.pdf', size: 2456789, businessId: 'business-002' },
    ipAddress: '192.168.2.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    success: true,
  },
  {
    id: '7',
    action: 'user.role_changed',
    userId: 'user-004',
    userEmail: 'admin@hznavigator.com',
    targetType: 'user',
    targetId: 'user-006',
    details: { oldRole: 'user', newRole: 'reviewer', targetEmail: 'mike.r@agency.gov' },
    ipAddress: '10.0.0.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    success: true,
  },
  {
    id: '8',
    action: 'certification.denied',
    userId: 'user-002',
    userEmail: 'sarah.m@agency.gov',
    targetType: 'business',
    targetId: 'business-003',
    details: { businessName: 'XYZ Consulting', reason: 'Insufficient HUBZone residency rate' },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    success: true,
  },
  {
    id: '9',
    action: 'business.created',
    userId: 'user-007',
    userEmail: 'lisa.anderson@company.org',
    targetType: 'business',
    targetId: 'business-004',
    details: { businessName: 'Green Energy Corp', ueiNumber: 'GREEN987654' },
    ipAddress: '192.168.3.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    success: true,
  },
  {
    id: '10',
    action: 'system.maintenance_enabled',
    userId: 'user-004',
    userEmail: 'admin@hznavigator.com',
    targetType: 'system',
    targetId: null,
    details: { message: 'Scheduled maintenance window', duration: '2 hours' },
    ipAddress: '10.0.0.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    success: true,
  },
];

const actionCategories: Record<string, AuditAction[]> = {
  'User Actions': ['user.login', 'user.logout', 'user.created', 'user.updated', 'user.deleted', 'user.password_reset', 'user.role_changed'],
  'Business Actions': ['business.created', 'business.updated', 'business.deleted'],
  'Certification Actions': ['certification.approved', 'certification.denied', 'certification.suspended'],
  'Document Actions': ['document.uploaded', 'document.deleted'],
  'Admin Actions': ['admin.config_changed', 'admin.job_triggered'],
  'System Actions': ['system.maintenance_enabled', 'system.maintenance_disabled', 'compliance.override'],
};

const actionColors: Record<string, string> = {
  'user.login': 'bg-blue-100 text-blue-800',
  'user.logout': 'bg-gray-100 text-gray-800',
  'user.created': 'bg-green-100 text-green-800',
  'user.updated': 'bg-amber-100 text-amber-800',
  'user.deleted': 'bg-red-100 text-red-800',
  'user.password_reset': 'bg-purple-100 text-purple-800',
  'user.role_changed': 'bg-indigo-100 text-indigo-800',
  'business.created': 'bg-green-100 text-green-800',
  'business.updated': 'bg-amber-100 text-amber-800',
  'business.deleted': 'bg-red-100 text-red-800',
  'certification.approved': 'bg-green-100 text-green-800',
  'certification.denied': 'bg-red-100 text-red-800',
  'certification.suspended': 'bg-orange-100 text-orange-800',
  'document.uploaded': 'bg-blue-100 text-blue-800',
  'document.deleted': 'bg-red-100 text-red-800',
  'admin.config_changed': 'bg-purple-100 text-purple-800',
  'admin.job_triggered': 'bg-purple-100 text-purple-800',
  'system.maintenance_enabled': 'bg-amber-100 text-amber-800',
  'system.maintenance_disabled': 'bg-green-100 text-green-800',
  'compliance.override': 'bg-orange-100 text-orange-800',
};

function formatActionName(action: AuditAction): string {
  return action.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogs() {
  const [searchParams] = useSearchParams();
  const businessIdFilter = searchParams.get('businessId');
  
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [filters, setFilters] = useState<AuditLogFilters>({
    action: 'all',
    userEmail: '',
    startDate: '',
    endDate: '',
    success: undefined,
    page: 1,
    limit: 20,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filters.action && filters.action !== 'all' && log.action !== filters.action) return false;
    if (filters.userEmail && !log.userEmail?.toLowerCase().includes(filters.userEmail.toLowerCase())) return false;
    if (filters.startDate && new Date(log.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(log.timestamp) > new Date(filters.endDate)) return false;
    if (filters.success !== undefined && log.success !== filters.success) return false;
    if (businessIdFilter && log.targetId !== businessIdFilter && log.details?.businessId !== businessIdFilter) return false;
    return true;
  });

  const handleExport = (format: 'csv' | 'json') => {
    // In production, this would call the API to generate and download the file
    alert(`Exporting ${filteredLogs.length} logs as ${format.toUpperCase()}`);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system actions and changes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={filters.action || 'all'}
              onChange={(e) => setFilters({ ...filters, action: e.target.value as AuditAction | 'all' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
            >
              <option value="all">All Actions</option>
              {Object.entries(actionCategories).map(([category, actions]) => (
                <optgroup key={category} label={category}>
                  {actions.map((action) => (
                    <option key={action} value={action}>{formatActionName(action)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
            <input
              type="text"
              value={filters.userEmail || ''}
              onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.success === undefined ? 'all' : filters.success ? 'success' : 'failed'}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({
                  ...filters,
                  success: value === 'all' ? undefined : value === 'success',
                });
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {(filters.action !== 'all' || filters.userEmail || filters.startDate || filters.endDate || filters.success !== undefined || businessIdFilter) && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {filters.action !== 'all' && (
              <span className="px-2 py-1 bg-hubzone-100 text-hubzone-700 text-xs rounded-full">
                {formatActionName(filters.action as AuditAction)}
              </span>
            )}
            {filters.userEmail && (
              <span className="px-2 py-1 bg-hubzone-100 text-hubzone-700 text-xs rounded-full">
                Email: {filters.userEmail}
              </span>
            )}
            {filters.startDate && (
              <span className="px-2 py-1 bg-hubzone-100 text-hubzone-700 text-xs rounded-full">
                From: {filters.startDate}
              </span>
            )}
            {filters.endDate && (
              <span className="px-2 py-1 bg-hubzone-100 text-hubzone-700 text-xs rounded-full">
                To: {filters.endDate}
              </span>
            )}
            {filters.success !== undefined && (
              <span className="px-2 py-1 bg-hubzone-100 text-hubzone-700 text-xs rounded-full">
                {filters.success ? 'Success' : 'Failed'}
              </span>
            )}
            {businessIdFilter && (
              <span className="px-2 py-1 bg-hubzone-100 text-hubzone-700 text-xs rounded-full">
                Business: {businessIdFilter}
              </span>
            )}
            <button
              onClick={() => setFilters({ action: 'all', userEmail: '', startDate: '', endDate: '', success: undefined, page: 1, limit: 20 })}
              className="text-sm text-hubzone-600 hover:text-hubzone-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{formatRelativeTime(log.timestamp)}</p>
                      <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {formatActionName(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{log.userEmail || 'System'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900 capitalize">{log.targetType}</p>
                      {log.targetId && (
                        <p className="text-xs text-gray-500 truncate max-w-32">{log.targetId}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.ipAddress}</code>
                  </td>
                  <td className="px-4 py-3">
                    {log.success ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredLogs.length} logs
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Previous</button>
            <span className="text-sm text-gray-600">Page 1</span>
            <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setSelectedLog(null)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${actionColors[selectedLog.action] || 'bg-gray-100 text-gray-800'}`}>
                    {formatActionName(selectedLog.action)}
                  </span>
                  {selectedLog.success ? (
                    <span className="text-green-600 text-sm">Success</span>
                  ) : (
                    <span className="text-red-600 text-sm">Failed</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Timestamp</p>
                    <p className="font-medium text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Log ID</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedLog.id}</code>
                  </div>
                  <div>
                    <p className="text-gray-500">User</p>
                    <p className="font-medium text-gray-900">{selectedLog.userEmail || 'System'}</p>
                    {selectedLog.userId && (
                      <p className="text-xs text-gray-500">ID: {selectedLog.userId}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500">Target</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedLog.targetType}</p>
                    {selectedLog.targetId && (
                      <p className="text-xs text-gray-500">ID: {selectedLog.targetId}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500">IP Address</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedLog.ipAddress}</code>
                  </div>
                  <div>
                    <p className="text-gray-500">User Agent</p>
                    <p className="text-xs text-gray-600 truncate" title={selectedLog.userAgent}>
                      {selectedLog.userAgent.slice(0, 50)}...
                    </p>
                  </div>
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Additional Details</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowExportModal(false)} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Audit Logs</h3>
                <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Export {filteredLogs.length} filtered log entries. Current filters will be applied.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Export as CSV</p>
                      <p className="text-sm text-gray-500">Spreadsheet format</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Export as JSON</p>
                      <p className="text-sm text-gray-500">Machine-readable format</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


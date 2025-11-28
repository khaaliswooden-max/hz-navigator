/**
 * System Configuration Page
 * Environment variables, feature flags, maintenance mode, rate limits, email templates
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FeatureFlag, EmailTemplate } from '../../types/admin';

// Mock data
const mockFeatureFlags: FeatureFlag[] = [
  { id: '1', name: 'new_dashboard', description: 'Enable new dashboard design for users', enabled: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z', rolloutPercentage: 100 },
  { id: '2', name: 'ai_document_processing', description: 'AI-powered document analysis and OCR', enabled: true, createdAt: '2023-11-01T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z', rolloutPercentage: 50 },
  { id: '3', name: 'advanced_analytics', description: 'Advanced analytics dashboard for agencies', enabled: false, createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-05T00:00:00Z', rolloutPercentage: 0 },
  { id: '4', name: 'bulk_upload', description: 'Allow bulk employee data upload via CSV', enabled: true, createdAt: '2023-09-01T00:00:00Z', updatedAt: '2023-12-01T00:00:00Z', rolloutPercentage: 100 },
  { id: '5', name: 'real_time_notifications', description: 'Push notifications for compliance alerts', enabled: true, createdAt: '2023-10-01T00:00:00Z', updatedAt: '2024-01-12T00:00:00Z', rolloutPercentage: 75 },
  { id: '6', name: 'two_factor_required', description: 'Require 2FA for all admin accounts', enabled: true, createdAt: '2023-06-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', rolloutPercentage: 100, enabledForRoles: ['admin'] },
];

const mockEmailTemplates: EmailTemplate[] = [
  { id: '1', name: 'welcome_email', subject: 'Welcome to HZ Navigator!', body: 'Hello {{name}}, welcome to HZ Navigator...', variables: ['name', 'email'], lastUpdated: '2024-01-10T00:00:00Z' },
  { id: '2', name: 'certification_approved', subject: 'Your HUBZone Certification Has Been Approved', body: 'Congratulations {{businessName}}! Your certification...', variables: ['businessName', 'certificationDate', 'expirationDate'], lastUpdated: '2024-01-05T00:00:00Z' },
  { id: '3', name: 'certification_denied', subject: 'HUBZone Certification Application Update', body: 'Dear {{ownerName}}, we regret to inform you...', variables: ['ownerName', 'businessName', 'reason'], lastUpdated: '2024-01-05T00:00:00Z' },
  { id: '4', name: 'password_reset', subject: 'Reset Your Password', body: 'Click the link below to reset your password: {{resetLink}}', variables: ['name', 'resetLink'], lastUpdated: '2023-12-15T00:00:00Z' },
  { id: '5', name: 'compliance_alert', subject: 'Compliance Alert: Action Required', body: 'Dear {{ownerName}}, your business {{businessName}} requires...', variables: ['ownerName', 'businessName', 'alertType', 'deadline'], lastUpdated: '2024-01-08T00:00:00Z' },
];

const mockEnvVariables = [
  { key: 'DATABASE_URL', value: '••••••••••••••••', isSecret: true, description: 'PostgreSQL connection string' },
  { key: 'JWT_SECRET', value: '••••••••••••••••', isSecret: true, description: 'JWT signing secret' },
  { key: 'AWS_S3_BUCKET', value: 'hz-navigator-prod', isSecret: false, description: 'S3 bucket for document storage' },
  { key: 'SMTP_HOST', value: 'smtp.sendgrid.net', isSecret: false, description: 'Email SMTP host' },
  { key: 'SBA_API_KEY', value: '••••••••••••••••', isSecret: true, description: 'SBA HUBZone API key' },
  { key: 'REDIS_URL', value: '••••••••••••••••', isSecret: true, description: 'Redis connection string' },
  { key: 'LOG_LEVEL', value: 'info', isSecret: false, description: 'Application log level' },
  { key: 'MAX_FILE_SIZE', value: '10485760', isSecret: false, description: 'Maximum file upload size in bytes' },
];

export default function SystemConfig() {
  const [activeTab, setActiveTab] = useState<'flags' | 'maintenance' | 'rate-limits' | 'env' | 'email'>('flags');
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(mockFeatureFlags);
  const [emailTemplates] = useState<EmailTemplate[]>(mockEmailTemplates);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently performing scheduled maintenance. Please check back soon.');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('');
  const [rateLimits, setRateLimits] = useState({
    auth: 10,
    api: 100,
    upload: 20,
    admin: 50,
  });
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleToggleFlag = (flagId: string) => {
    setFeatureFlags((prev) =>
      prev.map((flag) => (flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag))
    );
  };

  const handleUpdateRollout = (flagId: string, percentage: number) => {
    setFeatureFlags((prev) =>
      prev.map((flag) => (flag.id === flagId ? { ...flag, rolloutPercentage: percentage } : flag))
    );
  };

  const handleToggleMaintenance = () => {
    if (!maintenanceMode) {
      if (!confirm('Are you sure you want to enable maintenance mode? Users will not be able to access the platform.')) {
        return;
      }
    }
    setMaintenanceMode(!maintenanceMode);
  };

  const tabs = [
    { id: 'flags', label: 'Feature Flags', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    )},
    { id: 'maintenance', label: 'Maintenance', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'rate-limits', label: 'Rate Limits', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )},
    { id: 'env', label: 'Environment', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { id: 'email', label: 'Email Templates', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-500 mt-1">Manage platform settings and features</p>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-hubzone-600 text-hubzone-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Feature Flags Tab */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Toggle features on/off and control rollout percentage.</p>
                <button className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700">
                  Add Feature Flag
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 text-sm font-mono rounded">{flag.name}</code>
                        {flag.enabledForRoles && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                            {flag.enabledForRoles.join(', ')} only
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{flag.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {flag.enabled && (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={flag.rolloutPercentage}
                            onChange={(e) => handleUpdateRollout(flag.id, parseInt(e.target.value))}
                            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-sm text-gray-600 w-12">{flag.rolloutPercentage}%</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleToggleFlag(flag.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          flag.enabled ? 'bg-hubzone-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            flag.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Mode Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-xl border-2 ${maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${maintenanceMode ? 'bg-red-100' : 'bg-gray-200'}`}>
                      {maintenanceMode ? (
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${maintenanceMode ? 'text-red-900' : 'text-gray-900'}`}>
                        Maintenance Mode is {maintenanceMode ? 'ACTIVE' : 'Inactive'}
                      </h3>
                      <p className={`text-sm ${maintenanceMode ? 'text-red-700' : 'text-gray-500'}`}>
                        {maintenanceMode ? 'Users cannot access the platform' : 'Platform is operating normally'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleMaintenance}
                    className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                      maintenanceMode
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Message</label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    placeholder="Message to display to users..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated End Time</label>
                  <input
                    type="datetime-local"
                    value={maintenanceEndTime}
                    onChange={(e) => setMaintenanceEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>
                <button className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700">
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Rate Limits Tab */}
          {activeTab === 'rate-limits' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">Configure rate limits for different API endpoints (requests per minute).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Endpoints</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={rateLimits.auth}
                      onChange={(e) => setRateLimits({ ...rateLimits, auth: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-500">requests/minute</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Login, registration, password reset</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">General API Endpoints</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={rateLimits.api}
                      onChange={(e) => setRateLimits({ ...rateLimits, api: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-500">requests/minute</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Standard API operations</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">File Upload Endpoints</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={rateLimits.upload}
                      onChange={(e) => setRateLimits({ ...rateLimits, upload: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-500">requests/minute</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Document and file uploads</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin API Endpoints</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={rateLimits.admin}
                      onChange={(e) => setRateLimits({ ...rateLimits, admin: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-500">requests/minute</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Admin operations</p>
                </div>
              </div>
              <button className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700">
                Save Rate Limits
              </button>
            </div>
          )}

          {/* Environment Variables Tab */}
          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    Environment variables are read-only. Changes must be made in the deployment configuration.
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Variable</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mockEnvVariables.map((env) => (
                      <tr key={env.key} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono text-gray-900">{env.key}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-600">{env.value}</code>
                            {env.isSecret && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">secret</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{env.description}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Email Templates Tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Manage email templates sent to users.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emailTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-hubzone-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name.replace(/_/g, ' ')}</h4>
                        <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-hubzone-600"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span key={v} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Last updated: {new Date(template.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Template Edit Modal */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowTemplateModal(false)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Email Template</h3>
                <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                  <textarea
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500 font-mono text-sm"
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {editingTemplate.variables.map((v) => (
                      <code key={v} className="px-2 py-0.5 text-xs bg-white border border-gray-200 rounded">
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button className="px-4 py-2 text-sm text-hubzone-600 hover:text-hubzone-700">
                  Preview Email
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                    Cancel
                  </button>
                  <button className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700">
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


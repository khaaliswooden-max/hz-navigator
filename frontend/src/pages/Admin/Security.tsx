/**
 * Security Settings Page
 * 2FA settings, IP whitelist, session management, password policies
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SecuritySettings, AdminSession } from '../../types/admin';

// Mock data
const mockSecuritySettings: SecuritySettings = {
  twoFactorRequired: true,
  ipWhitelist: ['10.0.0.0/8', '192.168.1.0/24', '172.16.0.0/12'],
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expirationDays: 90,
  },
};

const mockSessions: AdminSession[] = [
  {
    id: 'session-001',
    userId: 'user-001',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 300000).toISOString(),
    isCurrent: true,
  },
  {
    id: 'session-002',
    userId: 'user-001',
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 43200000).toISOString(),
    lastActivity: new Date(Date.now() - 7200000).toISOString(),
    isCurrent: false,
  },
  {
    id: 'session-003',
    userId: 'user-002',
    ipAddress: '172.16.0.25',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) Safari/605.1',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    expiresAt: new Date(Date.now() + 21600000).toISOString(),
    lastActivity: new Date(Date.now() - 14400000).toISOString(),
    isCurrent: false,
  },
];

export default function AdminSecurity() {
  const [settings, setSettings] = useState<SecuritySettings>(mockSecuritySettings);
  const [sessions] = useState<AdminSession[]>(mockSessions);
  const [newIp, setNewIp] = useState('');
  const [showIpModal, setShowIpModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'2fa' | 'ip' | 'sessions' | 'password'>('2fa');

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    setSettings({
      ...settings,
      ipWhitelist: [...settings.ipWhitelist, newIp.trim()],
    });
    setNewIp('');
    setShowIpModal(false);
  };

  const handleRemoveIp = (ip: string) => {
    if (!confirm(`Remove ${ip} from whitelist?`)) return;
    setSettings({
      ...settings,
      ipWhitelist: settings.ipWhitelist.filter((i) => i !== ip),
    });
  };

  const handleTerminateSession = (sessionId: string) => {
    if (!confirm('Terminate this session?')) return;
    alert('Session terminated');
  };

  const handleTerminateAllSessions = () => {
    if (!confirm('Terminate all other sessions? Users will be logged out.')) return;
    alert('All sessions terminated');
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const getBrowserIcon = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return '🌐';
    if (userAgent.includes('Firefox')) return '🦊';
    if (userAgent.includes('Safari')) return '🧭';
    if (userAgent.includes('Edge')) return '📘';
    return '🌍';
  };

  const tabs = [
    { id: '2fa', label: 'Two-Factor Auth', icon: '🔐' },
    { id: 'ip', label: 'IP Whitelist', icon: '🌐' },
    { id: 'sessions', label: 'Active Sessions', icon: '💻' },
    { id: 'password', label: 'Password Policy', icon: '🔑' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Security Settings</h1>
          <p className="text-gray-500 mt-1">Configure security policies and access controls</p>
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

      {/* Security Status Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Security Status: Strong</h3>
            <p className="text-sm text-green-700">
              2FA enabled • IP whitelist active • {sessions.length} active sessions
            </p>
          </div>
        </div>
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
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* 2FA Tab */}
          {activeTab === '2fa' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-gray-900">Require 2FA for Admin Accounts</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    All admin users must have two-factor authentication enabled
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, twoFactorRequired: !settings.twoFactorRequired })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.twoFactorRequired ? 'bg-hubzone-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.twoFactorRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Important Security Notice</p>
                    <p className="text-sm text-amber-700 mt-1">
                      When 2FA is required, admin users without 2FA will be prompted to set it up on their next login.
                      They will not be able to access admin features until 2FA is configured.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Supported 2FA Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Authenticator App</p>
                        <p className="text-sm text-gray-500">Google Authenticator, Authy, etc.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-xl opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Hardware Keys</p>
                        <p className="text-sm text-gray-500">Coming soon</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IP Whitelist Tab */}
          {activeTab === 'ip' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Admin IP Whitelist</h4>
                  <p className="text-sm text-gray-500">
                    Only allow admin access from these IP addresses or CIDR ranges
                  </p>
                </div>
                <button
                  onClick={() => setShowIpModal(true)}
                  className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700"
                >
                  Add IP Address
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP / CIDR</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {settings.ipWhitelist.map((ip) => (
                      <tr key={ip} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{ip}</code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {ip.includes('/') ? 'CIDR Range' : 'Single IP'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveIp(ip)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If no IPs are whitelisted, admin access is allowed from any IP address.
                  Your current IP will always be allowed while you're logged in.
                </p>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Active Admin Sessions</h4>
                  <p className="text-sm text-gray-500">{sessions.length} sessions currently active</p>
                </div>
                <button
                  onClick={handleTerminateAllSessions}
                  className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
                >
                  Terminate All Others
                </button>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border ${session.isCurrent ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getBrowserIcon(session.userAgent)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{session.ipAddress}</p>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">
                                Current Session
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {session.userAgent.includes('Windows') ? 'Windows' :
                             session.userAgent.includes('Mac') ? 'macOS' :
                             session.userAgent.includes('iPhone') ? 'iOS' :
                             session.userAgent.includes('Android') ? 'Android' : 'Unknown OS'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Last active: {formatTimeAgo(session.lastActivity)}
                          </p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleTerminateSession(session.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Terminate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-500">minutes of inactivity</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-500">attempts before lockout</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password Policy Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Password Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
                    <input
                      type="number"
                      value={settings.passwordPolicy.minLength}
                      onChange={(e) => setSettings({
                        ...settings,
                        passwordPolicy: { ...settings.passwordPolicy, minLength: parseInt(e.target.value) }
                      })}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.passwordPolicy.expirationDays}
                        onChange={(e) => setSettings({
                          ...settings,
                          passwordPolicy: { ...settings.passwordPolicy, expirationDays: parseInt(e.target.value) }
                        })}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                      />
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-4">Character Requirements</h4>
                <div className="space-y-3">
                  {[
                    { key: 'requireUppercase', label: 'Require uppercase letters (A-Z)' },
                    { key: 'requireLowercase', label: 'Require lowercase letters (a-z)' },
                    { key: 'requireNumbers', label: 'Require numbers (0-9)' },
                    { key: 'requireSpecialChars', label: 'Require special characters (!@#$%^&*)' },
                  ].map((requirement) => (
                    <div key={requirement.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{requirement.label}</span>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          passwordPolicy: {
                            ...settings.passwordPolicy,
                            [requirement.key]: !settings.passwordPolicy[requirement.key as keyof typeof settings.passwordPolicy]
                          }
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          settings.passwordPolicy[requirement.key as keyof typeof settings.passwordPolicy] ? 'bg-hubzone-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            settings.passwordPolicy[requirement.key as keyof typeof settings.passwordPolicy] ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">Lockout Duration</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.lockoutDuration}
                    onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) })}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                  <span className="text-sm text-gray-500">minutes after max failed attempts</span>
                </div>
              </div>

              <button className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700">
                Save Password Policy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add IP Modal */}
      {showIpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowIpModal(false)} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add IP to Whitelist</h3>
                <button onClick={() => setShowIpModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address or CIDR Range</label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="e.g., 192.168.1.100 or 10.0.0.0/8"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  You can enter a single IP address or a CIDR range to whitelist multiple addresses.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowIpModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  onClick={handleAddIp}
                  disabled={!newIp.trim()}
                  className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
                >
                  Add to Whitelist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


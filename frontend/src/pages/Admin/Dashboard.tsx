/**
 * Admin Dashboard
 * Platform overview with statistics, system health, and activity feed
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalBusinesses: number;
  certifiedBusinesses: number;
  pendingCertifications: number;
  averageComplianceScore: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastIncident?: string;
  components: {
    database: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
    email: 'healthy' | 'unhealthy';
  };
}

interface ActivityItem {
  id: string;
  type: 'user' | 'business' | 'certification' | 'system' | 'security';
  action: string;
  description: string;
  user?: { email: string; name: string };
  timestamp: string;
}

// Mock data - in production, fetch from API
const mockStats: PlatformStats = {
  totalUsers: 45231,
  activeUsers: 3421,
  newUsersToday: 156,
  totalBusinesses: 23841,
  certifiedBusinesses: 18234,
  pendingCertifications: 47,
  averageComplianceScore: 87.3,
};

const mockHealth: SystemHealth = {
  status: 'healthy',
  uptime: 99.97,
  responseTime: 145,
  errorRate: 0.02,
  lastIncident: '2024-01-02T10:30:00Z',
  components: {
    database: 'healthy',
    cache: 'healthy',
    storage: 'healthy',
    email: 'healthy',
  },
};

const usersByRole = [
  { role: 'Business Owners', count: 38450, color: '#0073c7' },
  { role: 'Professionals', count: 5892, color: '#10b981' },
  { role: 'Agency Users', count: 845, color: '#8b5cf6' },
  { role: 'Admins', count: 44, color: '#f59e0b' },
];

const activityData = [
  { date: 'Mon', logins: 2340, registrations: 45, verifications: 23 },
  { date: 'Tue', logins: 2890, registrations: 52, verifications: 31 },
  { date: 'Wed', logins: 3120, registrations: 48, verifications: 28 },
  { date: 'Thu', logins: 2980, registrations: 61, verifications: 35 },
  { date: 'Fri', logins: 3240, registrations: 55, verifications: 42 },
  { date: 'Sat', logins: 1890, registrations: 32, verifications: 18 },
  { date: 'Sun', logins: 1560, registrations: 28, verifications: 12 },
];

const mockActivity: ActivityItem[] = [
  { id: '1', type: 'user', action: 'User registered', description: 'New user registration', user: { email: 'john.doe@example.com', name: 'John Doe' }, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: '2', type: 'certification', action: 'Certification approved', description: 'ABC Federal Solutions', user: { email: 'reviewer@agency.gov', name: 'Sarah Miller' }, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: '3', type: 'system', action: 'Map data updated', description: '234 HUBZone boundaries updated', timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: '4', type: 'certification', action: 'Certification denied', description: 'XYZ Consulting LLC', user: { email: 'reviewer2@agency.gov', name: 'Mike Roberts' }, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: '5', type: 'security', action: 'Failed login attempt', description: '5 failed attempts from IP 192.168.1.100', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '6', type: 'business', action: 'Business profile updated', description: 'Tech Solutions Inc.', user: { email: 'owner@techsolutions.com', name: 'Jane Smith' }, timestamp: new Date(Date.now() - 7200000).toISOString() },
];

const mapUpdateStatus = {
  lastUpdate: '2024-01-15T10:30:00Z',
  nextScheduled: '2024-02-01T00:00:00Z',
  status: 'completed' as const,
  zonesUpdated: 234,
  jobId: 'job-123',
};

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
  return `${diffDays}d ago`;
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'user':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'business':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'certification':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    case 'system':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'security':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
}

function getActivityColor(type: ActivityItem['type']) {
  switch (type) {
    case 'user': return 'bg-blue-100 text-blue-600';
    case 'business': return 'bg-purple-100 text-purple-600';
    case 'certification': return 'bg-green-100 text-green-600';
    case 'system': return 'bg-gray-100 text-gray-600';
    case 'security': return 'bg-amber-100 text-amber-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function AdminDashboard() {
  const [stats] = useState<PlatformStats>(mockStats);
  const [health] = useState<SystemHealth>(mockHealth);
  const [activity] = useState<ActivityItem[]>(mockActivity);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // In production, fetch data from API
    setIsLoading(false);
  }, []);

  const healthStatusColor = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-amber-100 text-amber-800 border-amber-200',
    unhealthy: 'bg-red-100 text-red-800 border-red-200',
  };

  const healthStatusIcon = {
    healthy: (
      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    degraded: (
      <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    unhealthy: (
      <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hubzone-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and system management</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Audit Logs
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
          >
            Manage Users
          </Link>
        </div>
      </div>

      {/* System Health Banner */}
      <div className={`rounded-xl p-5 border ${healthStatusColor[health.status]}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${health.status === 'healthy' ? 'bg-green-200' : health.status === 'degraded' ? 'bg-amber-200' : 'bg-red-200'}`}>
              {healthStatusIcon[health.status]}
            </div>
            <div>
              <h3 className="font-semibold">
                {health.status === 'healthy' ? 'All Systems Operational' : 
                 health.status === 'degraded' ? 'Degraded Performance' : 'System Issues Detected'}
              </h3>
              <p className="text-sm opacity-80">
                Uptime: {health.uptime}% • Response: {health.responseTime}ms • Errors: {health.errorRate}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(health.components).map(([name, status]) => (
              <div
                key={name}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'healthy' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                }`}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">+{stats.newUsersToday} today</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Certified Businesses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.certifiedBusinesses.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">of {stats.totalBusinesses.toLocaleString()} total</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingCertifications}</p>
              <p className="text-xs text-amber-600 mt-1">Requires attention</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Platform Activity</h3>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="logins" stackId="1" stroke="#0073c7" fill="#bae0fd" name="Logins" />
                <Area type="monotone" dataKey="registrations" stackId="2" stroke="#10b981" fill="#d1fae5" name="Registrations" />
                <Area type="monotone" dataKey="verifications" stackId="3" stroke="#8b5cf6" fill="#e9d5ff" name="Verifications" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {usersByRole.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {usersByRole.map((item) => (
              <div key={item.role} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.role}</span>
                </div>
                <span className="font-medium text-gray-900">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Link to="/admin/audit-logs" className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {activity.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(item.type)}`}>
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.user ? `${item.user.name} • ` : ''}{item.description}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Update Status & Quick Actions */}
        <div className="space-y-6">
          {/* Map Update Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HUBZone Map Status</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                mapUpdateStatus.status === 'completed' ? 'bg-green-100' : 
                mapUpdateStatus.status === 'running' ? 'bg-blue-100' : 'bg-red-100'
              }`}>
                {mapUpdateStatus.status === 'completed' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : mapUpdateStatus.status === 'running' ? (
                  <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {mapUpdateStatus.status === 'completed' ? 'Data Up to Date' : 
                   mapUpdateStatus.status === 'running' ? 'Update in Progress' : 'Update Failed'}
                </p>
                <p className="text-sm text-gray-500">{mapUpdateStatus.zonesUpdated} zones updated</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Last Update</span>
                <span className="font-medium text-gray-900">{new Date(mapUpdateStatus.lastUpdate).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-gray-500">Next Scheduled</span>
                <span className="font-medium text-gray-900">{new Date(mapUpdateStatus.nextScheduled).toLocaleDateString()}</span>
              </div>
            </div>
            <Link
              to="/admin/jobs"
              className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
            >
              Manage Jobs
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/admin/users"
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Users</p>
                  <p className="text-xs text-gray-500">Manage accounts</p>
                </div>
              </Link>
              <Link
                to="/admin/businesses"
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Businesses</p>
                  <p className="text-xs text-gray-500">Certifications</p>
                </div>
              </Link>
              <Link
                to="/admin/config"
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Settings</p>
                  <p className="text-xs text-gray-500">Configuration</p>
                </div>
              </Link>
              <Link
                to="/admin/analytics"
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500">Reports</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


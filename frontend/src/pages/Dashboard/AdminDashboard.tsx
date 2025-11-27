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
} from 'recharts';
import { Link } from 'react-router-dom';
import { StatCard, ChartCard, AlertsList, QuickActions } from '../../components/Dashboard';
import type { Alert, QuickAction } from '../../components/Dashboard';
import { useAuth } from '../../hooks/useAuth';

// Mock data
const platformStats = {
  totalUsers: 45231,
  activeToday: 3421,
  totalBusinesses: 23841,
  pendingVerifications: 47,
};

const userActivityData = [
  { date: 'Mon', logins: 2340, signups: 45, verifications: 23 },
  { date: 'Tue', logins: 2890, signups: 52, verifications: 31 },
  { date: 'Wed', logins: 3120, signups: 48, verifications: 28 },
  { date: 'Thu', logins: 2980, signups: 61, verifications: 35 },
  { date: 'Fri', logins: 3240, signups: 55, verifications: 42 },
  { date: 'Sat', logins: 1890, signups: 32, verifications: 18 },
  { date: 'Sun', logins: 1560, signups: 28, verifications: 12 },
];

const usersByRole = [
  { role: 'Business Owners', count: 38450, color: '#0073c7' },
  { role: 'Professionals', count: 5892, color: '#36acf8' },
  { role: 'Reviewers', count: 845, color: '#7cc8fc' },
  { role: 'Admins', count: 44, color: '#bae0fd' },
];

const systemHealth = {
  status: 'operational',
  uptime: 99.97,
  responseTime: 145,
  errorRate: 0.02,
  lastIncident: '2024-01-02',
};

const mapUpdateStatus = {
  lastUpdate: '2024-01-15T10:30:00Z',
  nextScheduled: '2024-02-01T00:00:00Z',
  zonesUpdated: 234,
  status: 'completed',
};

const recentActivity = [
  { id: '1', action: 'User registered', user: 'john.doe@example.com', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: '2', action: 'Business verified', user: 'sarah.m@agency.gov', details: 'ABC Federal Solutions', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: '3', action: 'Map data updated', user: 'system', details: '234 zones updated', timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: '4', action: 'Verification denied', user: 'mike.r@agency.gov', details: 'XYZ Consulting', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: '5', action: 'Password reset', user: 'jane.smith@business.com', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

const systemAlerts: Alert[] = [
  {
    id: '1',
    type: 'success',
    title: 'Database Backup Completed',
    message: 'Daily backup completed successfully. 45GB of data backed up to offsite storage.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '2',
    type: 'info',
    title: 'Scheduled Maintenance',
    message: 'System maintenance scheduled for Sunday 2:00 AM - 4:00 AM EST. Minimal disruption expected.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    type: 'warning',
    title: 'High API Usage',
    message: 'API rate limit at 85% capacity. Consider scaling if usage continues to increase.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    link: '/admin/api',
    linkText: 'View API stats',
  },
];

const quickActions: QuickAction[] = [
  {
    id: '1',
    label: 'Manage Users',
    description: 'View and edit user accounts',
    to: '/users',
    variant: 'primary',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: '2',
    label: 'Audit Log',
    description: 'View system activity',
    to: '/audit-log',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: '3',
    label: 'System Settings',
    description: 'Configure platform',
    to: '/admin/settings',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: '4',
    label: 'Update Map Data',
    description: 'Sync HUBZone boundaries',
    to: '/admin/map-sync',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

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

export default function AdminDashboard() {
  useAuth(); // Ensure user is authenticated

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Platform overview and system management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Admin Console
          </Link>
          <Link
            to="/reports"
            className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
          >
            View Reports
          </Link>
        </div>
      </div>

      {/* System status banner */}
      <div className={`rounded-xl p-5 ${systemHealth.status === 'operational' ? 'bg-verified-50 border border-verified-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${systemHealth.status === 'operational' ? 'bg-verified-100' : 'bg-red-100'}`}>
              {systemHealth.status === 'operational' ? (
                <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className={`font-semibold ${systemHealth.status === 'operational' ? 'text-verified-900' : 'text-red-900'}`}>
                All Systems Operational
              </h3>
              <p className={`text-sm ${systemHealth.status === 'operational' ? 'text-verified-700' : 'text-red-700'}`}>
                Uptime: {systemHealth.uptime}% • Response time: {systemHealth.responseTime}ms • Error rate: {systemHealth.errorRate}%
              </p>
            </div>
          </div>
          <Link
            to="/admin/status"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${systemHealth.status === 'operational' ? 'bg-verified-600 text-white hover:bg-verified-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            View Status Page
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={platformStats.totalUsers.toLocaleString()}
          change="+1,234 this month"
          trend="up"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Today"
          value={platformStats.activeToday.toLocaleString()}
          change="7.6% of total"
          trend="neutral"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Businesses"
          value={platformStats.totalBusinesses.toLocaleString()}
          change="+156 this month"
          trend="up"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Pending Reviews"
          value={platformStats.pendingVerifications}
          change="12 urgent"
          trend="neutral"
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User activity chart */}
        <ChartCard
          title="User Activity"
          subtitle="Last 7 days"
          className="lg:col-span-2"
          height={280}
          action={
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userActivityData}>
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
              <Area
                type="monotone"
                dataKey="logins"
                stackId="1"
                stroke="#0073c7"
                fill="#bae0fd"
                name="Logins"
              />
              <Area
                type="monotone"
                dataKey="signups"
                stackId="2"
                stroke="#10b981"
                fill="#d1fae5"
                name="Signups"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Users by role */}
        <ChartCard title="Users by Role" height={280}>
          <ResponsiveContainer width="100%" height="70%">
            <BarChart data={usersByRole} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis type="category" dataKey="role" stroke="#6b7280" fontSize={10} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#0073c7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{platformStats.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total registered users</p>
          </div>
        </ChartCard>
      </div>

      {/* Activity and Map Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Link
              to="/audit-log"
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {activity.user}
                    {activity.details && ` • ${activity.details}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Map update status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Map Data Status</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${mapUpdateStatus.status === 'completed' ? 'bg-verified-100' : 'bg-amber-100'}`}>
                {mapUpdateStatus.status === 'completed' ? (
                  <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {mapUpdateStatus.status === 'completed' ? 'Data Up to Date' : 'Update in Progress'}
                </h4>
                <p className="text-sm text-gray-500">
                  {mapUpdateStatus.zonesUpdated} zones updated
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Last Update</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(mapUpdateStatus.lastUpdate).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Next Scheduled</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(mapUpdateStatus.nextScheduled).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Data Source</span>
                <span className="text-sm font-medium text-hubzone-600">SBA Official API</span>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors">
              Trigger Manual Update
            </button>
          </div>
        </div>
      </div>

      {/* System alerts */}
      <AlertsList
        alerts={systemAlerts}
        title="System Alerts"
        showViewAll
        viewAllLink="/admin/alerts"
      />

      {/* Quick actions */}
      <QuickActions
        actions={quickActions}
        title="Quick Actions"
        layout="grid"
        columns={4}
      />
    </div>
  );
}


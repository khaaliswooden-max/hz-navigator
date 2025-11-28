/**
 * Analytics Page
 * User growth, business growth, API usage, error rates, popular features
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Mock data
const userGrowthData = [
  { month: 'Jan', users: 38500, newUsers: 1200, activeUsers: 12400 },
  { month: 'Feb', users: 39200, newUsers: 700, activeUsers: 13100 },
  { month: 'Mar', users: 40100, newUsers: 900, activeUsers: 14200 },
  { month: 'Apr', users: 41300, newUsers: 1200, activeUsers: 15800 },
  { month: 'May', users: 42500, newUsers: 1200, activeUsers: 16500 },
  { month: 'Jun', users: 43800, newUsers: 1300, activeUsers: 17200 },
  { month: 'Jul', users: 45231, newUsers: 1431, activeUsers: 18100 },
];

const businessGrowthData = [
  { month: 'Jan', total: 21500, certified: 16200, pending: 45 },
  { month: 'Feb', total: 22100, certified: 16800, pending: 52 },
  { month: 'Mar', total: 22600, certified: 17200, pending: 38 },
  { month: 'Apr', total: 22900, certified: 17500, pending: 61 },
  { month: 'May', total: 23200, certified: 17800, pending: 44 },
  { month: 'Jun', total: 23500, certified: 18000, pending: 55 },
  { month: 'Jul', total: 23841, certified: 18234, pending: 47 },
];

const apiUsageData = [
  { hour: '00:00', requests: 1200 },
  { hour: '02:00', requests: 800 },
  { hour: '04:00', requests: 600 },
  { hour: '06:00', requests: 1500 },
  { hour: '08:00', requests: 4500 },
  { hour: '10:00', requests: 6200 },
  { hour: '12:00', requests: 5800 },
  { hour: '14:00', requests: 6500 },
  { hour: '16:00', requests: 5200 },
  { hour: '18:00', requests: 3800 },
  { hour: '20:00', requests: 2500 },
  { hour: '22:00', requests: 1800 },
];

const errorRateData = [
  { date: 'Mon', errors: 23, total: 45000, rate: 0.051 },
  { date: 'Tue', errors: 18, total: 52000, rate: 0.035 },
  { date: 'Wed', errors: 31, total: 48000, rate: 0.065 },
  { date: 'Thu', errors: 15, total: 51000, rate: 0.029 },
  { date: 'Fri', errors: 22, total: 55000, rate: 0.040 },
  { date: 'Sat', errors: 8, total: 32000, rate: 0.025 },
  { date: 'Sun', errors: 5, total: 28000, rate: 0.018 },
];

const errorsByType = [
  { type: '400 Bad Request', count: 45, color: '#f59e0b' },
  { type: '401 Unauthorized', count: 28, color: '#ef4444' },
  { type: '403 Forbidden', count: 12, color: '#f97316' },
  { type: '404 Not Found', count: 8, color: '#6b7280' },
  { type: '500 Server Error', count: 5, color: '#dc2626' },
  { type: 'Other', count: 2, color: '#9ca3af' },
];

const topEndpoints = [
  { endpoint: '/api/v1/businesses', requests: 125000, avgTime: 45, errorRate: 0.02 },
  { endpoint: '/api/v1/auth/login', requests: 89000, avgTime: 120, errorRate: 0.15 },
  { endpoint: '/api/v1/hubzones/check', requests: 67000, avgTime: 280, errorRate: 0.01 },
  { endpoint: '/api/v1/documents', requests: 45000, avgTime: 350, errorRate: 0.05 },
  { endpoint: '/api/v1/employees', requests: 38000, avgTime: 65, errorRate: 0.02 },
  { endpoint: '/api/v1/compliance', requests: 32000, avgTime: 95, errorRate: 0.01 },
];

const popularFeatures = [
  { feature: 'HUBZone Checker', usage: 45000, trend: 12.5 },
  { feature: 'Document Upload', usage: 38000, trend: 8.2 },
  { feature: 'Employee Management', usage: 32000, trend: -2.1 },
  { feature: 'Compliance Dashboard', usage: 28000, trend: 15.8 },
  { feature: 'Map Explorer', usage: 25000, trend: 22.3 },
  { feature: 'Analytics Reports', usage: 18000, trend: 5.4 },
];

const COLORS = ['#0073c7', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'];

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const stats = {
    totalApiRequests: '2.4M',
    avgResponseTime: '142ms',
    errorRate: '0.04%',
    uptime: '99.97%',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Platform performance and usage metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total API Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalApiRequests}</p>
          <p className="text-xs text-green-600 mt-1">+12.5% from last period</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgResponseTime}</p>
          <p className="text-xs text-green-600 mt-1">-8.2% from last period</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Error Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.errorRate}</p>
          <p className="text-xs text-green-600 mt-1">-15.3% from last period</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Uptime</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.uptime}</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <p className="text-sm text-gray-500">Total and active users over time</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-hubzone-600" />
              <span className="text-gray-600">Total Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Active Users</span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#0073c7" fill="#bae0fd" name="Total Users" />
              <Area type="monotone" dataKey="activeUsers" stroke="#10b981" fill="#d1fae5" name="Active Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Business Growth & Certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Business Growth</h3>
              <p className="text-sm text-gray-500">Total businesses and certifications</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={businessGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="total" fill="#0073c7" name="Total Businesses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="certified" fill="#10b981" name="Certified" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">API Usage by Hour</h3>
              <p className="text-sm text-gray-500">Request distribution throughout the day</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Requests" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Error Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Error Rate Trend</h3>
              <p className="text-sm text-gray-500">Daily error rates over the past week</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'rate') return [`${(value * 100).toFixed(2)}%`, 'Error Rate'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="errors" fill="#ef4444" name="Errors" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Errors by Type</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={errorsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {errorsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {errorsByType.slice(0, 4).map((error) => (
              <div key={error.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: error.color }} />
                  <span className="text-gray-600">{error.type}</span>
                </div>
                <span className="font-medium text-gray-900">{error.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Endpoints & Popular Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top API Endpoints</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Endpoint</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Requests</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Avg Time</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topEndpoints.map((endpoint) => (
                  <tr key={endpoint.endpoint} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-900">{endpoint.endpoint}</code>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {(endpoint.requests / 1000).toFixed(0)}k
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {endpoint.avgTime}ms
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${endpoint.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                        {(endpoint.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Popular Features</h3>
          </div>
          <div className="p-5 space-y-4">
            {popularFeatures.map((feature, index) => (
              <div key={feature.feature} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                    <span className="text-sm text-gray-600">{(feature.usage / 1000).toFixed(0)}k uses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(feature.usage / 45000) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                    <span className={`text-xs ${feature.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {feature.trend >= 0 ? '+' : ''}{feature.trend}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </button>
      </div>
    </div>
  );
}


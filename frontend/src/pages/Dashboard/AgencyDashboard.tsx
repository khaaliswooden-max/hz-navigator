import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { StatCard, ChartCard, AlertsList, QuickActions, ProgressCard } from '../../components/Dashboard';
import type { Alert, QuickAction } from '../../components/Dashboard';
import { useAuth } from '../../hooks/useAuth';

// Mock data
const fiscalYearGoals = {
  current: 2.8,
  target: 3.0,
  contractsAwarded: 156,
  totalValue: 48500000,
};

const monthlyProgress = [
  { month: 'Oct', goal: 2.5, actual: 2.4 },
  { month: 'Nov', goal: 2.6, actual: 2.5 },
  { month: 'Dec', goal: 2.7, actual: 2.7 },
  { month: 'Jan', goal: 2.8, actual: 2.8 },
  { month: 'Feb', goal: 2.9, actual: 2.8 },
  { month: 'Mar', goal: 3.0, actual: null },
];

const contractsByCategory = [
  { name: 'IT Services', value: 45, color: '#0073c7' },
  { name: 'Construction', value: 28, color: '#36acf8' },
  { name: 'Professional', value: 32, color: '#7cc8fc' },
  { name: 'Manufacturing', value: 25, color: '#bae0fd' },
  { name: 'Other', value: 26, color: '#e0effe' },
];

const recentVerifications = [
  { id: '1', business: 'ABC Federal Solutions', type: 'Initial', status: 'approved', date: '2024-01-18', reviewer: 'John D.' },
  { id: '2', business: 'Capitol Tech Services', type: 'Recertification', status: 'pending', date: '2024-01-17', reviewer: 'Pending' },
  { id: '3', business: 'Metro Construction LLC', type: 'Initial', status: 'under_review', date: '2024-01-16', reviewer: 'Sarah M.' },
  { id: '4', business: 'DC Consulting Group', type: 'Recertification', status: 'approved', date: '2024-01-15', reviewer: 'Mike R.' },
];

const recentAlerts: Alert[] = [
  {
    id: '1',
    type: 'info',
    title: 'New HUBZone Designation',
    message: '5 new census tracts in Maryland have been designated as HUBZone areas effective Q2 2024.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    link: '/map',
    linkText: 'View on map',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Goal Progress Alert',
    message: 'Current HUBZone contracting is 0.2% below fiscal year target. Consider outreach to certified businesses.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    link: '/reports',
  },
  {
    id: '3',
    type: 'success',
    title: 'Monthly Target Met',
    message: 'December HUBZone contracting goal of 2.7% has been successfully achieved.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
];

const topBusinesses = [
  { id: '1', name: 'Federal IT Partners', contracts: 12, value: 4500000, state: 'VA' },
  { id: '2', name: 'Capitol Construction Inc.', contracts: 8, value: 3200000, state: 'MD' },
  { id: '3', name: 'DC Tech Solutions', contracts: 6, value: 2800000, state: 'DC' },
  { id: '4', name: 'Metro Services Group', contracts: 5, value: 2100000, state: 'VA' },
  { id: '5', name: 'Atlantic Consulting', contracts: 4, value: 1800000, state: 'MD' },
];

const quickActions: QuickAction[] = [
  {
    id: '1',
    label: 'Search Businesses',
    description: 'Find certified HUBZone businesses',
    to: '/businesses',
    variant: 'primary',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: '2',
    label: 'Review Queue',
    description: 'Pending verifications',
    to: '/verifications',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: '3',
    label: 'Generate Report',
    description: 'Export analytics data',
    to: '/reports/new',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: '4',
    label: 'Explore Map',
    description: 'View HUBZone areas',
    to: '/map',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

const statusStyles = {
  approved: { bg: 'bg-verified-100', text: 'text-verified-700' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  under_review: { bg: 'bg-hubzone-100', text: 'text-hubzone-700' },
  denied: { bg: 'bg-red-100', text: 'text-red-700' },
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export default function AgencyDashboard() {
  const { user } = useAuth();
  const goalPercentage = Math.round((fiscalYearGoals.current / fiscalYearGoals.target) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Agency Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            HUBZone Program Performance - FY{new Date().getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600">
            <option>FY {new Date().getFullYear()}</option>
            <option>FY {new Date().getFullYear() - 1}</option>
            <option>FY {new Date().getFullYear() - 2}</option>
          </select>
          <button className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Goal progress banner */}
      <div className="bg-gradient-to-r from-federal-500 to-hubzone-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white/90">HUBZone Contracting Goal Progress</h2>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl font-bold">{fiscalYearGoals.current}%</span>
              <span className="text-lg text-white/80">of {fiscalYearGoals.target}% goal</span>
            </div>
            <p className="text-sm text-white/70 mt-2">
              {fiscalYearGoals.contractsAwarded} contracts awarded • {formatCurrency(fiscalYearGoals.totalValue)} total value
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/80">Progress to Goal</span>
              <span className="font-medium">{goalPercentage}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(goalPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/60 mt-2">
              {fiscalYearGoals.target - fiscalYearGoals.current > 0
                ? `${(fiscalYearGoals.target - fiscalYearGoals.current).toFixed(1)}% remaining to reach goal`
                : 'Goal achieved!'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Certified Businesses"
          value="23,841"
          change="+156 this month"
          trend="up"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Pending Reviews"
          value={47}
          change="12 urgent"
          trend="neutral"
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Contracts YTD"
          value={156}
          change="+23% vs last year"
          trend="up"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Contract Value YTD"
          value="$48.5M"
          change="+$12.3M vs last year"
          trend="up"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly progress chart */}
        <ChartCard
          title="Monthly Goal Tracking"
          subtitle="Target vs Actual"
          className="lg:col-span-2"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} domain={[2, 3.5]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number | null) => value ? `${value}%` : 'N/A'}
              />
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#0073c7"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Target"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
                name="Actual"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Contracts by category */}
        <ChartCard title="Contracts by Category" height={280}>
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {contractsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {contractsByCategory.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600 text-xs">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900 text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Verifications and Top Businesses row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent verifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Verifications</h3>
            <Link
              to="/verifications"
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentVerifications.map((verification) => {
              const status = statusStyles[verification.status as keyof typeof statusStyles];
              return (
                <div key={verification.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{verification.business}</p>
                    <p className="text-xs text-gray-500">{verification.type} • {verification.reviewer}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                      {verification.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(verification.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top businesses */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Contracted Businesses</h3>
            <Link
              to="/businesses"
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {topBusinesses.map((business, index) => (
              <div key={business.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-hubzone-100 flex items-center justify-center text-sm font-bold text-hubzone-700">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{business.name}</p>
                  <p className="text-xs text-gray-500">{business.state} • {business.contracts} contracts</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(business.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AlertsList
        alerts={recentAlerts}
        title="Program Alerts"
        showViewAll
        viewAllLink="/notifications"
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


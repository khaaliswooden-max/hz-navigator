import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard, ChartCard, AlertsList, QuickActions, ProgressCard } from '../../components/Dashboard';
import type { Alert, QuickAction } from '../../components/Dashboard';
import { useAuth } from '../../hooks/useAuth';

// Mock data - would come from API
const complianceData = {
  overall: 87,
  employeeResidency: 92,
  hubzoneResidency: 85,
  principalOffice: 100,
};

const employeeResidencyData = [
  { month: 'Jul', inZone: 45, outZone: 5 },
  { month: 'Aug', inZone: 47, outZone: 4 },
  { month: 'Sep', inZone: 46, outZone: 5 },
  { month: 'Oct', inZone: 48, outZone: 3 },
  { month: 'Nov', inZone: 49, outZone: 2 },
  { month: 'Dec', inZone: 50, outZone: 1 },
];

const employeeDistributionData = [
  { name: 'In HUBZone', value: 50, color: '#10b981' },
  { name: 'Outside HUBZone', value: 1, color: '#f59e0b' },
];

const upcomingDeadlines = [
  { id: '1', title: 'Annual Recertification', date: '2024-03-15', daysLeft: 45, priority: 'high' },
  { id: '2', title: 'Employee Census Update', date: '2024-02-01', daysLeft: 12, priority: 'medium' },
  { id: '3', title: 'Principal Office Verification', date: '2024-04-30', daysLeft: 90, priority: 'low' },
];

const recentAlerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Employee Moved Outside HUBZone',
    message: 'John Smith updated their address. New location is outside the designated HUBZone area.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    link: '/employees/1',
    linkText: 'Review employee',
  },
  {
    id: '2',
    type: 'success',
    title: 'Address Verification Complete',
    message: 'Your principal office address has been successfully verified as HUBZone eligible.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    type: 'info',
    title: 'Recertification Reminder',
    message: 'Your annual recertification is due in 45 days. Start gathering required documents.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    link: '/certifications',
    linkText: 'Start recertification',
  },
];

const quickActions: QuickAction[] = [
  {
    id: '1',
    label: 'Add Employee',
    description: 'Register a new employee',
    to: '/employees/new',
    variant: 'primary',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: '2',
    label: 'Verify Address',
    description: 'Check HUBZone eligibility',
    to: '/check',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: '3',
    label: 'Upload Document',
    description: 'Add compliance documents',
    to: '/documents/upload',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: '4',
    label: 'View Map',
    description: 'Explore HUBZone areas',
    to: '/map',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

function getComplianceColor(value: number): 'green' | 'amber' | 'red' {
  if (value >= 85) return 'green';
  if (value >= 70) return 'amber';
  return 'red';
}

function getPriorityBadge(priority: string) {
  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-gray-100 text-gray-700',
  };
  return styles[priority as keyof typeof styles] || styles.low;
}

export default function BusinessOwnerDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-500 mt-1">
            Here's an overview of your HUBZone compliance status
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-verified-100 text-verified-700 rounded-full font-medium">
            HUBZone Certified
          </span>
          <span className="text-gray-500">Since Jan 2023</span>
        </div>
      </div>

      {/* Compliance status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Overall Compliance"
          value={`${complianceData.overall}%`}
          change="On track"
          trend="up"
          color={getComplianceColor(complianceData.overall)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          label="Employee Residency"
          value={`${complianceData.employeeResidency}%`}
          change="35% requirement met"
          trend="up"
          color={getComplianceColor(complianceData.employeeResidency)}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Employees"
          value={51}
          change="+2 this month"
          trend="up"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Principal Office"
          value="Verified"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee residency trend */}
        <ChartCard
          title="Employee Residency Trend"
          subtitle="Last 6 months"
          className="lg:col-span-2"
          height={280}
          action={
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
              <option>Last 6 months</option>
              <option>Last year</option>
              <option>All time</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={employeeResidencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="inZone"
                stackId="1"
                stroke="#10b981"
                fill="#d1fae5"
                name="In HUBZone"
              />
              <Area
                type="monotone"
                dataKey="outZone"
                stackId="1"
                stroke="#f59e0b"
                fill="#fef3c7"
                name="Outside HUBZone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Employee distribution pie */}
        <ChartCard title="Employee Distribution" height={280}>
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {employeeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {employeeDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Deadlines and Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(deadline.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(deadline.priority)}`}>
                    {deadline.daysLeft} days
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <a href="/compliance" className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700">
              View all deadlines →
            </a>
          </div>
        </div>

        {/* Recent alerts */}
        <AlertsList
          alerts={recentAlerts}
          title="Recent Compliance Alerts"
          showViewAll
          viewAllLink="/notifications"
          emptyMessage="No compliance alerts"
        />
      </div>

      {/* Quick actions */}
      <QuickActions
        actions={quickActions}
        title="Quick Actions"
        layout="grid"
        columns={4}
      />

      {/* Compliance progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProgressCard
          title="35% Residency Requirement"
          value={50}
          max={51}
          label="Employees in HUBZone"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
        <ProgressCard
          title="Document Completion"
          value={8}
          max={10}
          label="Required documents uploaded"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <ProgressCard
          title="Profile Completion"
          value={95}
          max={100}
          label="Business profile data"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>
    </div>
  );
}


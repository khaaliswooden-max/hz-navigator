import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  FileCheck,
  DollarSign,
  MapPin,
  Calendar,
  RefreshCcw,
  Target,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import type {
  AnalyticsDashboard as DashboardData,
  DateRange,
  AgencyMetrics,
} from '../../types/analytics';
import { GOAL_STATUS_COLORS } from '../../types/analytics';
import {
  analyticsService,
  formatCurrency,
  formatCompactNumber,
  formatPercentage,
  getDateRangePresets,
  getDefaultAgencyId,
} from '../../services/analyticsService';

const CHART_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
const PIE_COLORS = ['#0d9488', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];

export function Analytics(): JSX.Element {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const presets = getDateRangePresets();
    return presets[0].range;
  });
  const [selectedPreset, setSelectedPreset] = useState(0);

  const datePresets = getDateRangePresets();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getAnalyticsDashboard(
        getDefaultAgencyId(),
        dateRange
      );
      setDashboard(data);
    } catch (err) {
      setError('Failed to load analytics dashboard');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePresetSelect = (index: number) => {
    setSelectedPreset(index);
    setDateRange(datePresets[index].range);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Analytics
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { metrics } = dashboard;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              HUBZone contracting metrics and performance insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              {datePresets.slice(0, 3).map((preset, index) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(index)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectedPreset === index
                      ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset.label.replace('Current ', '').replace('Last ', '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active HUBZone Businesses"
            value={metrics.activeHubzoneBusinesses.toLocaleString()}
            icon={Building2}
            trend={metrics.newCertificationsThisYear}
            trendLabel="new this year"
            color="teal"
          />
          <MetricCard
            title="New Certifications"
            value={metrics.newCertificationsThisYear.toLocaleString()}
            icon={FileCheck}
            subtitle={`${metrics.certificationsPendingReview} pending review`}
            color="purple"
          />
          <MetricCard
            title="Average Contract Value"
            value={formatCompactNumber(metrics.averageHubzoneContractValue)}
            icon={DollarSign}
            trend={metrics.hubzoneContractsAwarded}
            trendLabel="HUBZone contracts"
            color="emerald"
          />
          <MetricCard
            title="Goal Achievement"
            value={`${metrics.currentAchievedPercentage.toFixed(1)}%`}
            icon={Target}
            subtitle={`Target: ${metrics.currentGoalPercentage}%`}
            status={metrics.goalStatus}
            color="amber"
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contracts Over Time */}
          <ChartCard title="Contract Awards Over Time" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboard.contractsOverTime[0]?.data.map((d, i) => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
                total: d.value,
                hubzone: dashboard.contractsOverTime[1]?.data[i]?.value ?? 0,
              })) ?? []}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHubzone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: '#6b7280' }} />
                <YAxis className="text-xs" tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  name="Total Contracts"
                  stroke="#0d9488" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="hubzone" 
                  name="HUBZone Contracts"
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorHubzone)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Goal Achievement Trend */}
          <ChartCard title="Goal Achievement Trend" icon={Target}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboard.goalAchievementTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="label" className="text-xs" tick={{ fill: '#6b7280' }} />
                <YAxis 
                  className="text-xs" 
                  tick={{ fill: '#6b7280' }}
                  domain={[0, Math.max(metrics.currentGoalPercentage + 2, 10)]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Achievement']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0d9488" 
                  strokeWidth={3}
                  dot={{ fill: '#0d9488', strokeWidth: 2 }}
                />
                {/* Goal Line */}
                <Line
                  type="monotone"
                  dataKey={() => metrics.currentGoalPercentage}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Goal"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract Type Breakdown */}
          <ChartCard title="Contract Type Distribution" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dashboard.contractTypeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="label"
                >
                  {dashboard.contractTypeBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top States */}
          <ChartCard title="Top States by Contractor Count" icon={MapPin} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dashboard.topStates.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis type="number" className="text-xs" tick={{ fill: '#6b7280' }} />
                <YAxis 
                  dataKey="stateName" 
                  type="category" 
                  width={100}
                  className="text-xs" 
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} name="Contractors" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Contractors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              Top HUBZone Contractors
            </h3>
            <div className="space-y-3">
              {dashboard.topContractors.slice(0, 5).map((contractor, index) => (
                <div
                  key={contractor.ueiNumber}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {contractor.businessName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contractor.state} • {contractor.contractCount} contracts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCompactNumber(contractor.totalValue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top NAICS Codes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Top NAICS Codes
            </h3>
            <div className="space-y-3">
              {dashboard.topNaicsCodes.slice(0, 5).map((naics) => (
                <div key={naics.code} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {naics.code}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {naics.count} contractors
                    </span>
                  </div>
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                      style={{ width: `${naics.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {naics.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Period Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="text-teal-100">Total Contract Value</span>
                <span className="font-bold text-lg">{formatCompactNumber(metrics.totalContractValue)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="text-teal-100">HUBZone Value</span>
                <span className="font-bold text-lg">{formatCompactNumber(metrics.hubzoneContractValue)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/20">
                <span className="text-teal-100">Verifications</span>
                <span className="font-bold text-lg">{metrics.verificationsPerformed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-teal-100">Compliant Rate</span>
                <span className="font-bold text-lg">
                  {metrics.verificationsPerformed > 0
                    ? ((metrics.compliantVerifications / metrics.verificationsPerformed) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-teal-100">
                  Expiring in 30 days
                </span>
                <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                  metrics.expiringCertifications30Days > 10
                    ? 'bg-red-500'
                    : metrics.expiringCertifications30Days > 0
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}>
                  {metrics.expiringCertifications30Days}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  status?: AgencyMetrics['goalStatus'];
  color: 'teal' | 'purple' | 'emerald' | 'amber';
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  subtitle,
  status,
  color,
}: MetricCardProps): JSX.Element {
  const colorClasses = {
    teal: 'from-teal-500 to-emerald-600',
    purple: 'from-purple-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
  };

  const bgClasses = {
    teal: 'bg-teal-50 dark:bg-teal-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {status && (
          <div className="flex items-center gap-1">
            {status === 'on_track' ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            ) : status === 'behind' ? (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-amber-500" />
            )}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${GOAL_STATUS_COLORS[status]}20`,
                color: GOAL_STATUS_COLORS[status],
              }}
            >
              {status.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        {(trend !== undefined || subtitle) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {trend !== undefined ? (
              <>
                <span className="text-emerald-600 font-medium">+{trend}</span> {trendLabel}
              </>
            ) : (
              subtitle
            )}
          </p>
        )}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, icon: Icon, children, className = '' }: ChartCardProps): JSX.Element {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-teal-600" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default Analytics;


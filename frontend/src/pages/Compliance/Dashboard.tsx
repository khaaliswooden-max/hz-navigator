import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChartCard } from '../../components/Dashboard';
import { 
  ComplianceCard, 
  ResidencyChart, 
  RecommendedActions,
  type ComplianceStatus,
  type ResidencyDataPoint,
  type RecommendedAction,
} from '../../components/Compliance';

// Types for compliance data
interface ComplianceData {
  overallStatus: ComplianceStatus;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requirements: {
    employeeResidency: {
      status: ComplianceStatus;
      percentage: number;
      target: number;
      hubzoneEmployees: number;
      totalEmployees: number;
    };
    principalOffice: {
      status: ComplianceStatus;
      address: string;
      isVerified: boolean;
      lastVerified?: string;
    };
    certification: {
      status: ComplianceStatus;
      expirationDate: string;
      daysRemaining: number;
      certificationDate: string;
    };
    ownership: {
      status: ComplianceStatus;
      usCitizenPercentage: number;
      target: number;
    };
  };
  historicalData: ResidencyDataPoint[];
  lastUpdated: string;
}

// Mock data generator
function generateHistoricalData(days: number): ResidencyDataPoint[] {
  const data: ResidencyDataPoint[] = [];
  const now = new Date();
  
  // Start with a base percentage
  let basePercentage = 38;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 4;
    basePercentage = Math.max(30, Math.min(50, basePercentage + variation * 0.3));
    
    const totalEmployees = 51;
    const hubzoneEmployees = Math.round(totalEmployees * (basePercentage / 100));
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      percentage: Math.round(basePercentage * 10) / 10,
      totalEmployees,
      hubzoneEmployees,
    });
  }
  
  return data;
}

// Mock data
const mockComplianceData: ComplianceData = {
  overallStatus: 'compliant',
  overallScore: 87,
  riskLevel: 'low',
  requirements: {
    employeeResidency: {
      status: 'compliant',
      percentage: 42.3,
      target: 35,
      hubzoneEmployees: 22,
      totalEmployees: 52,
    },
    principalOffice: {
      status: 'compliant',
      address: '1234 Innovation Way, Baltimore, MD 21201',
      isVerified: true,
      lastVerified: '2024-10-15',
    },
    certification: {
      status: 'warning',
      expirationDate: '2025-01-12',
      daysRemaining: 45,
      certificationDate: '2024-01-12',
    },
    ownership: {
      status: 'compliant',
      usCitizenPercentage: 75,
      target: 51,
    },
  },
  historicalData: generateHistoricalData(30),
  lastUpdated: new Date().toISOString(),
};

const mockActions: RecommendedAction[] = [
  {
    id: '1',
    title: 'Renew HUBZone Certification',
    description: 'Your certification expires in 45 days. Begin the renewal process to maintain HUBZone status.',
    impact: 'Prevents loss of certification',
    priority: 'high',
    actionLabel: 'Start Renewal',
    actionLink: '/certifications',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: '2',
    title: 'Verify Employee Addresses',
    description: '3 employees have addresses that need verification. Confirm HUBZone residency to maintain accurate records.',
    impact: '+2.1% residency if verified',
    priority: 'medium',
    actionLabel: 'Review Addresses',
    actionLink: '/employees',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: '3',
    title: 'Hire HUBZone Resident',
    description: 'Consider hiring employees from HUBZone areas to increase your residency percentage buffer.',
    impact: '+1.9% per hire',
    priority: 'low',
    actionLabel: 'View HUBZone Map',
    actionLink: '/map',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: '4',
    title: 'Update Ownership Records',
    description: 'Keep ownership information current. Last updated 60 days ago.',
    impact: 'Ensures compliance accuracy',
    priority: 'low',
    actionLabel: 'Review Ownership',
    actionLink: '/businesses/1/ownership',
  },
];

const riskLevelStyles = {
  low: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    label: 'Low Risk',
    icon: '✓',
  },
  medium: {
    bg: 'bg-amber-500',
    text: 'text-amber-700',
    label: 'Medium Risk',
    icon: '!',
  },
  high: {
    bg: 'bg-orange-500',
    text: 'text-orange-700',
    label: 'High Risk',
    icon: '!!',
  },
  critical: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    label: 'Critical Risk',
    icon: '!!!',
  },
};

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch compliance data
  const fetchComplianceData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    }
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, showRefresh ? 500 : 1000));
    
    // Add slight variations to mock data for realism
    const data = {
      ...mockComplianceData,
      requirements: {
        ...mockComplianceData.requirements,
        employeeResidency: {
          ...mockComplianceData.requirements.employeeResidency,
          percentage: 42.3 + (Math.random() - 0.5) * 0.4,
        },
      },
      historicalData: generateHistoricalData(30),
      lastUpdated: new Date().toISOString(),
    };
    
    setComplianceData(data);
    setActions(mockActions);
    setLastRefresh(new Date());
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComplianceData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchComplianceData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Compliance Dashboard</h1>
            <p className="text-gray-500 mt-1">Loading compliance data...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!complianceData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load compliance data</p>
        <button
          onClick={() => fetchComplianceData()}
          className="mt-4 px-4 py-2 bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { requirements, riskLevel, overallScore, overallStatus } = complianceData;
  const riskStyle = riskLevelStyles[riskLevel];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500">
              Monitor your HUBZone compliance status
            </p>
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            {isRefreshing && (
              <svg className="w-4 h-4 text-hubzone-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchComplianceData(true)}
          disabled={isRefreshing}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <svg className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Overall Status Hero Card */}
      <div className={clsx(
        'relative overflow-hidden rounded-2xl p-6 lg:p-8',
        overallStatus === 'compliant' && 'bg-gradient-to-br from-emerald-500 to-teal-600',
        overallStatus === 'warning' && 'bg-gradient-to-br from-amber-500 to-orange-600',
        overallStatus === 'critical' && 'bg-gradient-to-br from-red-500 to-rose-600',
        overallStatus === 'unknown' && 'bg-gradient-to-br from-gray-500 to-slate-600'
      )}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-black/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Large compliance score */}
            <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
              <div className="text-center">
                <span className="text-4xl font-bold text-white">{overallScore}</span>
                <span className="block text-xs text-white/80 font-medium">Score</span>
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                {overallStatus === 'compliant' && 'Fully Compliant'}
                {overallStatus === 'warning' && 'Compliance at Risk'}
                {overallStatus === 'critical' && 'Non-Compliant'}
                {overallStatus === 'unknown' && 'Status Unknown'}
              </h2>
              <p className="text-white/80 text-sm lg:text-base max-w-md">
                {overallStatus === 'compliant' && 'Your business meets all HUBZone compliance requirements. Continue monitoring to maintain status.'}
                {overallStatus === 'warning' && 'Some requirements need attention. Review recommended actions to maintain compliance.'}
                {overallStatus === 'critical' && 'Immediate action required. Your HUBZone status may be at risk.'}
                {overallStatus === 'unknown' && 'Unable to determine compliance status. Please verify your information.'}
              </p>
            </div>
          </div>

          {/* Risk Level */}
          <div className="lg:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <div className={clsx('w-3 h-3 rounded-full', riskStyle.bg)} />
              <span className="text-white font-semibold">{riskStyle.label}</span>
            </div>
            <p className="text-white/70 text-sm mt-2">
              Based on current metrics
            </p>
          </div>
        </div>
      </div>

      {/* Requirement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Employee Residency */}
        <ComplianceCard
          title="Employee Residency"
          status={requirements.employeeResidency.status}
          value={`${requirements.employeeResidency.percentage.toFixed(1)}%`}
          target={`${requirements.employeeResidency.target}%`}
          subtitle={`${requirements.employeeResidency.hubzoneEmployees} of ${requirements.employeeResidency.totalEmployees} employees`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          details={{
            title: 'Employee Residency Details',
            items: [
              { label: 'Current Percentage', value: `${requirements.employeeResidency.percentage.toFixed(1)}%` },
              { label: 'Required Minimum', value: `${requirements.employeeResidency.target}%` },
              { label: 'HUBZone Employees', value: requirements.employeeResidency.hubzoneEmployees },
              { label: 'Total Employees', value: requirements.employeeResidency.totalEmployees },
              { label: 'Buffer Above Minimum', value: `+${(requirements.employeeResidency.percentage - requirements.employeeResidency.target).toFixed(1)}%` },
            ],
            actions: [
              { label: 'View All Employees', onClick: () => navigate('/employees') },
              { label: 'Check Address', onClick: () => navigate('/check') },
            ],
          }}
        />

        {/* Principal Office */}
        <ComplianceCard
          title="Principal Office"
          status={requirements.principalOffice.status}
          value={requirements.principalOffice.isVerified ? 'Verified' : 'Unverified'}
          subtitle={requirements.principalOffice.address}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          details={{
            title: 'Principal Office Details',
            items: [
              { label: 'Address', value: requirements.principalOffice.address },
              { label: 'Verification Status', value: requirements.principalOffice.isVerified ? 'Verified' : 'Pending' },
              { label: 'Last Verified', value: requirements.principalOffice.lastVerified ? new Date(requirements.principalOffice.lastVerified).toLocaleDateString() : 'N/A' },
            ],
            actions: [
              { label: 'Re-verify Address', onClick: () => navigate('/check') },
            ],
          }}
        />

        {/* Certification Status */}
        <ComplianceCard
          title="Certification Status"
          status={requirements.certification.status}
          value={`${requirements.certification.daysRemaining} days`}
          subtitle={`Expires ${new Date(requirements.certification.expirationDate).toLocaleDateString()}`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          details={{
            title: 'Certification Details',
            items: [
              { label: 'Certification Date', value: new Date(requirements.certification.certificationDate).toLocaleDateString() },
              { label: 'Expiration Date', value: new Date(requirements.certification.expirationDate).toLocaleDateString() },
              { label: 'Days Remaining', value: requirements.certification.daysRemaining },
              { label: 'Status', value: requirements.certification.daysRemaining > 60 ? 'Active' : 'Renewal Needed' },
            ],
            actions: [
              { label: 'Start Renewal Process', onClick: () => navigate('/certifications') },
            ],
          }}
        />

        {/* Ownership Compliance */}
        <ComplianceCard
          title="Ownership Compliance"
          status={requirements.ownership.status}
          value={`${requirements.ownership.usCitizenPercentage}%`}
          target={`${requirements.ownership.target}%`}
          subtitle="US Citizen Ownership"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          }
          details={{
            title: 'Ownership Details',
            items: [
              { label: 'US Citizen Ownership', value: `${requirements.ownership.usCitizenPercentage}%` },
              { label: 'Required Minimum', value: `${requirements.ownership.target}%` },
              { label: 'Buffer Above Minimum', value: `+${requirements.ownership.usCitizenPercentage - requirements.ownership.target}%` },
            ],
            actions: [
              { label: 'View Ownership Details', onClick: () => navigate('/businesses/1/ownership') },
            ],
          }}
        />
      </div>

      {/* Charts and Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical Trend Chart */}
        <ChartCard
          title="Residency Trend"
          subtitle="Last 30 days"
          height={360}
          action={
            <Link
              to="/reports"
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              View Reports
            </Link>
          }
        >
          <ResidencyChart
            data={complianceData.historicalData}
            threshold={35}
            greenZone={40}
            height={280}
          />
        </ChartCard>

        {/* Recommended Actions */}
        <RecommendedActions
          actions={actions}
          title="Recommended Actions"
          maxItems={4}
          showViewAll
          viewAllLink="/compliance/actions"
        />
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{requirements.employeeResidency.totalEmployees}</p>
          <p className="text-sm text-gray-500 mt-1">Total Employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{requirements.employeeResidency.hubzoneEmployees}</p>
          <p className="text-sm text-gray-500 mt-1">In HUBZone</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {requirements.employeeResidency.totalEmployees - requirements.employeeResidency.hubzoneEmployees}
          </p>
          <p className="text-sm text-gray-500 mt-1">Outside HUBZone</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-hubzone-600">{requirements.certification.daysRemaining}</p>
          <p className="text-sm text-gray-500 mt-1">Days Until Renewal</p>
        </div>
      </div>
    </div>
  );
}


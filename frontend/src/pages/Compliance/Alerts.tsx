import { useState, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { AlertCard, AlertDetail } from '../../components/Compliance';
import type { ComplianceAlert, AlertSeverity, AlertStatus } from '../../components/Compliance/AlertCard';

type SortOption = 'newest' | 'oldest' | 'severity';

// Mock data generator
function generateMockAlerts(): ComplianceAlert[] {
  return [
    {
      id: '1',
      severity: 'critical',
      status: 'active',
      title: 'Employee Residency Below Threshold',
      message: 'Your HUBZone employee residency percentage has dropped to 34.2%, below the required 35% minimum. Immediate action is required to maintain compliance.',
      category: 'Residency',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      metadata: {
        current_percentage: '34.2%',
        required_minimum: '35%',
        affected_employees: 3,
        days_to_cure: 30,
      },
      recommendedActions: [
        'Review recently moved employees to verify their current addresses',
        'Hire new employees who reside in HUBZone areas',
        'Update any outdated employee address records',
      ],
    },
    {
      id: '2',
      severity: 'high',
      status: 'active',
      title: 'Certification Expiring Soon',
      message: 'Your HUBZone certification will expire in 30 days. Begin the renewal process immediately to avoid lapses in certification status.',
      category: 'Certification',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      metadata: {
        expiration_date: 'Dec 27, 2025',
        days_remaining: 30,
        renewal_deadline: 'Nov 27, 2025',
      },
      recommendedActions: [
        'Gather all required documentation for renewal',
        'Schedule time to complete renewal application',
        'Review any changes in ownership or location since last certification',
      ],
    },
    {
      id: '3',
      severity: 'medium',
      status: 'acknowledged',
      title: 'Employee Address Verification Needed',
      message: '5 employees have addresses that have not been verified in the last 12 months. Regular verification ensures compliance accuracy.',
      category: 'Verification',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 86400000).toISOString(),
      acknowledgedBy: 'John Smith',
      metadata: {
        unverified_count: 5,
        total_employees: 52,
        oldest_verification: '14 months ago',
      },
      recommendedActions: [
        'Contact employees to confirm current addresses',
        'Request updated utility bills or lease agreements',
        'Update records in the system after verification',
      ],
    },
    {
      id: '4',
      severity: 'low',
      status: 'active',
      title: 'Principal Office Verification Due',
      message: 'Your annual principal office verification is due in 45 days. Schedule a verification to maintain compliance records.',
      category: 'Office',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      metadata: {
        last_verified: 'Nov 15, 2024',
        due_date: 'Jan 11, 2026',
      },
      recommendedActions: [
        'Review current principal office documentation',
        'Schedule verification appointment if needed',
      ],
    },
    {
      id: '5',
      severity: 'high',
      status: 'resolved',
      title: 'Ownership Compliance Issue',
      message: 'US citizen ownership percentage fell below 51% requirement due to ownership transfer.',
      category: 'Ownership',
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 518400000).toISOString(),
      acknowledgedBy: 'Jane Doe',
      resolvedAt: new Date(Date.now() - 432000000).toISOString(),
      resolvedBy: 'System',
      metadata: {
        previous_percentage: '49%',
        current_percentage: '75%',
        required_minimum: '51%',
      },
      history: [
        {
          action: 'Ownership records updated',
          user: 'Jane Doe',
          timestamp: new Date(Date.now() - 450000000).toISOString(),
          note: 'Added new US citizen owner with 30% stake',
        },
      ],
    },
    {
      id: '6',
      severity: 'medium',
      status: 'active',
      title: 'Document Upload Required',
      message: 'Supporting documentation for employee residency claims needs to be uploaded for 3 recently added employees.',
      category: 'Documents',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      metadata: {
        pending_documents: 3,
        document_types: 'Utility bills, Lease agreements',
      },
    },
    {
      id: '7',
      severity: 'critical',
      status: 'acknowledged',
      title: 'SBA Review Scheduled',
      message: 'The SBA has scheduled a program examination for your business. Prepare all compliance documentation for review.',
      category: 'Review',
      createdAt: new Date(Date.now() - 129600000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 86400000).toISOString(),
      acknowledgedBy: 'Admin',
      metadata: {
        review_date: 'Dec 15, 2025',
        review_type: 'Annual Program Examination',
        reviewer: 'SBA District Office',
      },
      recommendedActions: [
        'Compile all employee residency documentation',
        'Prepare ownership documentation and structure chart',
        'Review principal office lease and utility records',
        'Ensure all certifications are current and accessible',
      ],
    },
  ];
}

// Polling interval (30 seconds)
const POLL_INTERVAL = 30000;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  
  // Selection for bulk actions
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  
  // Detail modal
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null);

  // Fetch alerts
  const fetchAlerts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, showRefresh ? 500 : 1000));
    
    setAlerts(generateMockAlerts());
    setLastUpdated(new Date());
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => fetchAlerts(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      result = result.filter(a => a.severity === severityFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }
    
    // Apply sort
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'severity') {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return 0;
    });
    
    return result;
  }, [alerts, severityFilter, statusFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const active = alerts.filter(a => a.status === 'active');
    return {
      total: alerts.length,
      active: active.length,
      critical: active.filter(a => a.severity === 'critical').length,
      high: active.filter(a => a.severity === 'high').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
    };
  }, [alerts]);

  // Actions
  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id 
        ? { ...a, status: 'acknowledged' as AlertStatus, acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Current User' }
        : a
    ));
    setSelectedAlert(null);
  };

  const handleResolve = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id 
        ? { ...a, status: 'resolved' as AlertStatus, resolvedAt: new Date().toISOString(), resolvedBy: 'Current User' }
        : a
    ));
    setSelectedAlert(null);
  };

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setSelectedAlert(null);
  };

  const handleBulkAcknowledge = () => {
    setAlerts(prev => prev.map(a => 
      selectedAlerts.has(a.id) && a.status === 'active'
        ? { ...a, status: 'acknowledged' as AlertStatus, acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Current User' }
        : a
    ));
    setSelectedAlerts(new Set());
  };

  const handleArchiveResolved = () => {
    setAlerts(prev => prev.filter(a => a.status !== 'resolved'));
  };

  const handleSelectAlert = (id: string, selected: boolean) => {
    setSelectedAlerts(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map(a => a.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Compliance Alerts</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500">Manage and respond to compliance notifications</p>
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
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
          onClick={() => fetchAlerts(true)}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Alerts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-sm text-red-600">Critical</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.critical}</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p className="text-sm text-orange-600">High Priority</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{stats.high}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-sm text-emerald-600">Resolved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Severity:</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="severity">By Severity</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {selectedAlerts.size > 0 && (
              <>
                <span className="text-sm text-gray-500">
                  {selectedAlerts.size} selected
                </span>
                <button
                  onClick={handleBulkAcknowledge}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Acknowledge Selected
                </button>
              </>
            )}
            {stats.resolved > 0 && (
              <button
                onClick={handleArchiveResolved}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive Resolved
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {/* Select All */}
        {filteredAlerts.length > 0 && (
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
            />
            <span className="text-sm text-gray-500">
              Select all ({filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}

        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">No alerts found</p>
            <p className="text-sm text-gray-500 mt-1">
              {severityFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'All compliance requirements are being met'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={alert.id}
              className="animate-in fade-in slide-in-from-top-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <AlertCard
                alert={alert}
                onAcknowledge={alert.status === 'active' ? handleAcknowledge : undefined}
                onDismiss={handleDismiss}
                onViewDetails={setSelectedAlert}
                selectable
                selected={selectedAlerts.has(alert.id)}
                onSelect={handleSelectAlert}
              />
            </div>
          ))
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={selectedAlert.status === 'active' ? handleAcknowledge : undefined}
          onResolve={selectedAlert.status === 'acknowledged' ? handleResolve : undefined}
          onDismiss={selectedAlert.status === 'active' ? handleDismiss : undefined}
        />
      )}
    </div>
  );
}


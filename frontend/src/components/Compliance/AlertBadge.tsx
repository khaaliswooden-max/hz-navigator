import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import type { ComplianceAlert, AlertSeverity } from './AlertCard';

// Polling interval (30 seconds)
const POLL_INTERVAL = 30000;

// Mock data
const mockAlerts: ComplianceAlert[] = [
  {
    id: '1',
    severity: 'critical',
    status: 'active',
    title: 'Employee Residency Below Threshold',
    message: 'Your HUBZone employee residency percentage has dropped to 34.2%, below the required 35% minimum.',
    category: 'Residency',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    severity: 'high',
    status: 'active',
    title: 'Certification Expiring Soon',
    message: 'Your HUBZone certification will expire in 30 days. Begin the renewal process immediately.',
    category: 'Certification',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    severity: 'medium',
    status: 'active',
    title: 'Employee Address Verification Needed',
    message: '5 employees have addresses that have not been verified in the last 12 months.',
    category: 'Verification',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const severityColors: Record<AlertSeverity, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-500', text: 'text-red-600', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-500', text: 'text-orange-600', dot: 'bg-orange-500' },
  medium: { bg: 'bg-amber-500', text: 'text-amber-600', dot: 'bg-amber-500' },
  low: { bg: 'bg-blue-500', text: 'text-blue-600', dot: 'bg-blue-500' },
};

const severityLabels: Record<AlertSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getHighestSeverity(alerts: ComplianceAlert[]): AlertSeverity | null {
  const severityOrder: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];
  
  for (const severity of severityOrder) {
    if (alerts.some(a => a.severity === severity && a.status === 'active')) {
      return severity;
    }
  }
  
  return null;
}

export default function AlertBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const unacknowledgedCount = activeAlerts.length;
  const highestSeverity = getHighestSeverity(activeAlerts);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Get badge color based on highest severity
  const getBadgeColor = () => {
    if (!highestSeverity) return 'bg-gray-400';
    return severityColors[highestSeverity].bg;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Alert Button */}
      <button
        type="button"
        className={clsx(
          'relative p-2 rounded-lg transition-colors',
          highestSeverity === 'critical' 
            ? 'text-red-600 hover:bg-red-50' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Compliance Alerts${unacknowledgedCount > 0 ? ` (${unacknowledgedCount} active)` : ''}`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>

        {/* Unacknowledged badge */}
        {unacknowledgedCount > 0 && (
          <span className={clsx(
            'absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 text-white text-xs font-bold rounded-full flex items-center justify-center',
            getBadgeColor(),
            highestSeverity === 'critical' && 'animate-pulse'
          )}>
            {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Compliance Alerts</h3>
              {unacknowledgedCount > 0 && (
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-bold text-white',
                  getBadgeColor()
                )}>
                  {unacknowledgedCount} active
                </span>
              )}
            </div>
            {highestSeverity && (
              <span className={clsx(
                'text-xs font-semibold',
                severityColors[highestSeverity].text
              )}>
                {severityLabels[highestSeverity]} Priority
              </span>
            )}
          </div>

          {/* Alerts list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-hubzone-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 mt-2">Loading alerts...</p>
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">All clear!</p>
                <p className="text-xs text-gray-500 mt-1">No active compliance alerts</p>
              </div>
            ) : (
              activeAlerts.slice(0, 3).map((alert) => {
                const colors = severityColors[alert.severity];
                return (
                  <Link
                    key={alert.id}
                    to="/compliance/alerts"
                    className={clsx(
                      'block px-4 py-3 hover:bg-gray-50 transition-colors',
                      alert.severity === 'critical' && 'bg-red-50/50'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex gap-3">
                      <div className={clsx(
                        'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                        colors.dot
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {alert.title}
                          </p>
                          <span className={clsx(
                            'px-1.5 py-0.5 rounded text-xs font-semibold',
                            alert.severity === 'critical' && 'bg-red-100 text-red-700',
                            alert.severity === 'high' && 'bg-orange-100 text-orange-700',
                            alert.severity === 'medium' && 'bg-amber-100 text-amber-700',
                            alert.severity === 'low' && 'bg-blue-100 text-blue-700'
                          )}>
                            {severityLabels[alert.severity]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <Link
              to="/compliance/alerts"
              className="block text-center text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
              onClick={() => setIsOpen(false)}
            >
              View all alerts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export { AlertBadge };


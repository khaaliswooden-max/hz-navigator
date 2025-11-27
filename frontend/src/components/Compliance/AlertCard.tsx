import { useState } from 'react';
import { clsx } from 'clsx';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface ComplianceAlert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  category: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, string | number>;
  recommendedActions?: string[];
  history?: {
    action: string;
    user: string;
    timestamp: string;
    note?: string;
  }[];
}

interface AlertCardProps {
  alert: ComplianceAlert;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onViewDetails?: (alert: ComplianceAlert) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  compact?: boolean;
}

const severityStyles: Record<AlertSeverity, {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  icon: string;
  indicator: string;
}> = {
  critical: {
    bg: 'bg-red-50 hover:bg-red-100/70',
    border: 'border-red-200',
    badge: 'bg-red-100',
    badgeText: 'text-red-700',
    icon: 'text-red-600',
    indicator: 'bg-red-500',
  },
  high: {
    bg: 'bg-orange-50 hover:bg-orange-100/70',
    border: 'border-orange-200',
    badge: 'bg-orange-100',
    badgeText: 'text-orange-700',
    icon: 'text-orange-600',
    indicator: 'bg-orange-500',
  },
  medium: {
    bg: 'bg-amber-50 hover:bg-amber-100/70',
    border: 'border-amber-200',
    badge: 'bg-amber-100',
    badgeText: 'text-amber-700',
    icon: 'text-amber-600',
    indicator: 'bg-amber-500',
  },
  low: {
    bg: 'bg-blue-50 hover:bg-blue-100/70',
    border: 'border-blue-200',
    badge: 'bg-blue-100',
    badgeText: 'text-blue-700',
    icon: 'text-blue-600',
    indicator: 'bg-blue-500',
  },
};

const statusLabels: Record<AlertStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

const severityLabels: Record<AlertSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const severityIcons: Record<AlertSeverity, React.ReactNode> = {
  critical: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  high: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  medium: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  low: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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

export default function AlertCard({
  alert,
  onAcknowledge,
  onDismiss,
  onViewDetails,
  selectable = false,
  selected = false,
  onSelect,
  compact = false,
}: AlertCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const styles = severityStyles[alert.severity];
  const isActive = alert.status === 'active';

  return (
    <div
      className={clsx(
        'relative rounded-xl border transition-all duration-200',
        styles.bg,
        styles.border,
        selected && 'ring-2 ring-hubzone-500',
        compact ? 'p-3' : 'p-4',
        onViewDetails && 'cursor-pointer'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails?.(alert)}
    >
      {/* Critical indicator pulse */}
      {alert.severity === 'critical' && isActive && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Checkbox for selection */}
        {selectable && (
          <div className="flex items-start pt-0.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect?.(alert.id, e.target.checked);
              }}
              className="w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Severity Icon */}
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
          styles.bg,
          styles.border,
          styles.icon
        )}>
          {severityIcons[alert.severity]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Title and badges */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {alert.title}
                </h4>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  styles.badge,
                  styles.badgeText
                )}>
                  {severityLabels[alert.severity]}
                </span>
                {alert.status !== 'active' && (
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    alert.status === 'acknowledged' && 'bg-gray-100 text-gray-600',
                    alert.status === 'resolved' && 'bg-emerald-100 text-emerald-700'
                  )}>
                    {statusLabels[alert.status]}
                  </span>
                )}
              </div>

              {/* Message */}
              <p className={clsx(
                'text-sm text-gray-600',
                compact ? 'line-clamp-1' : 'line-clamp-2'
              )}>
                {alert.message}
              </p>

              {/* Meta info */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {getRelativeTime(alert.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {alert.category}
                </span>
              </div>
            </div>

            {/* Time indicator */}
            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
              {formatDate(alert.createdAt).split(',')[0]}
            </span>
          </div>

          {/* Actions */}
          {(isHovered || !compact) && isActive && (onAcknowledge || onDismiss) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/50">
              {onAcknowledge && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcknowledge(alert.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Acknowledge
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(alert.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Dismiss
                </button>
              )}
              {onViewDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(alert);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-hubzone-600 hover:text-hubzone-700 transition-colors ml-auto"
                >
                  View Details
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AlertCard };


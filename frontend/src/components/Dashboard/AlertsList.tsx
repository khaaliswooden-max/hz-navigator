import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  link?: string;
  linkText?: string;
}

interface AlertsListProps {
  alerts: Alert[];
  title?: string;
  emptyMessage?: string;
  showViewAll?: boolean;
  viewAllLink?: string;
  maxItems?: number;
}

const alertStyles = {
  info: {
    bg: 'bg-hubzone-50',
    border: 'border-hubzone-200',
    icon: 'text-hubzone-600',
    iconBg: 'bg-hubzone-100',
  },
  success: {
    bg: 'bg-verified-50',
    border: 'border-verified-200',
    icon: 'text-verified-600',
    iconBg: 'bg-verified-100',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
  },
};

const alertIcons = {
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function AlertsList({
  alerts,
  title = 'Recent Alerts',
  emptyMessage = 'No alerts to display',
  showViewAll = false,
  viewAllLink = '/notifications',
  maxItems = 5,
}: AlertsListProps) {
  const displayedAlerts = alerts.slice(0, maxItems);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showViewAll && alerts.length > 0 && (
          <Link
            to={viewAllLink}
            className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
          >
            View all
          </Link>
        )}
      </div>

      {/* Alerts list */}
      <div className="divide-y divide-gray-100">
        {displayedAlerts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          displayedAlerts.map((alert) => {
            const styles = alertStyles[alert.type];
            return (
              <div
                key={alert.id}
                className={clsx(
                  'px-5 py-4 transition-colors hover:bg-gray-50',
                  styles.bg
                )}
              >
                <div className="flex gap-3">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    styles.iconBg,
                    styles.icon
                  )}>
                    {alertIcons[alert.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{alert.message}</p>
                    {alert.link && (
                      <Link
                        to={alert.link}
                        className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
                      >
                        {alert.linkText || 'View details'}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


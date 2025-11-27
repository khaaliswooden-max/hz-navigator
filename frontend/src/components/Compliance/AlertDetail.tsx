import { clsx } from 'clsx';
import type { ComplianceAlert, AlertSeverity, AlertStatus } from './AlertCard';

interface AlertDetailProps {
  alert: ComplianceAlert;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge?: (id: string, note?: string) => void;
  onResolve?: (id: string, note?: string) => void;
  onDismiss?: (id: string) => void;
}

const severityStyles: Record<AlertSeverity, {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  icon: string;
}> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100',
    badgeText: 'text-red-700',
    icon: 'text-red-600',
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100',
    badgeText: 'text-orange-700',
    icon: 'text-orange-600',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100',
    badgeText: 'text-amber-700',
    icon: 'text-amber-600',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100',
    badgeText: 'text-blue-700',
    icon: 'text-blue-600',
  },
};

const statusStyles: Record<AlertStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-red-100', text: 'text-red-700' },
  acknowledged: { bg: 'bg-gray-100', text: 'text-gray-700' },
  resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const severityLabels: Record<AlertSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const statusLabels: Record<AlertStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AlertDetail({
  alert,
  isOpen,
  onClose,
  onAcknowledge,
  onResolve,
  onDismiss,
}: AlertDetailProps) {
  if (!isOpen) return null;

  const styles = severityStyles[alert.severity];
  const status = statusStyles[alert.status];
  const isActive = alert.status === 'active';
  const isAcknowledged = alert.status === 'acknowledged';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        
        <div 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={clsx(
            'px-6 py-4 rounded-t-2xl border-b',
            styles.bg,
            styles.border
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  styles.bg,
                  styles.border,
                  'border',
                  styles.icon
                )}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{alert.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      styles.badge,
                      styles.badgeText
                    )}>
                      {severityLabels[alert.severity]}
                    </span>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      status.bg,
                      status.text
                    )}>
                      {statusLabels[alert.status]}
                    </span>
                    <span className="text-xs text-gray-500">{alert.category}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Message */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Alert Message</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                {alert.message}
              </p>
            </div>

            {/* Metadata */}
            {alert.metadata && Object.keys(alert.metadata).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Details</h3>
                <dl className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
                  {Object.entries(alert.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs text-gray-500 capitalize">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Recommended Actions */}
            {alert.recommendedActions && alert.recommendedActions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommended Actions</h3>
                <ul className="space-y-2">
                  {alert.recommendedActions.map((action, index) => (
                    <li 
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600 bg-hubzone-50 rounded-lg p-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-hubzone-100 text-hubzone-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">History</h3>
              <div className="relative pl-6 space-y-4">
                {/* Timeline line */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                
                {/* Created event */}
                <div className="relative">
                  <div className="absolute -left-4 w-4 h-4 rounded-full bg-gray-300 border-2 border-white" />
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900">Alert Created</p>
                    <p className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</p>
                  </div>
                </div>

                {/* Acknowledged event */}
                {alert.acknowledgedAt && (
                  <div className="relative">
                    <div className="absolute -left-4 w-4 h-4 rounded-full bg-amber-400 border-2 border-white" />
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">Acknowledged</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(alert.acknowledgedAt)}
                        {alert.acknowledgedBy && ` by ${alert.acknowledgedBy}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resolved event */}
                {alert.resolvedAt && (
                  <div className="relative">
                    <div className="absolute -left-4 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">Resolved</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(alert.resolvedAt)}
                        {alert.resolvedBy && ` by ${alert.resolvedBy}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Additional history events */}
                {alert.history?.map((event, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-4 w-4 h-4 rounded-full bg-gray-400 border-2 border-white" />
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">{event.action}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(event.timestamp)} by {event.user}
                      </p>
                      {event.note && (
                        <p className="text-xs text-gray-600 mt-1 italic">"{event.note}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-gray-400 pt-4 border-t border-gray-100">
              <p>Alert ID: {alert.id}</p>
              <p>Created: {formatDateTime(alert.createdAt)}</p>
            </div>
          </div>

          {/* Footer with actions */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {onDismiss && isActive && (
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {onAcknowledge && isActive && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                {onResolve && isAcknowledged && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AlertDetail };


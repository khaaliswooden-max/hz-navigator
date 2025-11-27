import { useState } from 'react';
import { clsx } from 'clsx';

export type ComplianceStatus = 'compliant' | 'warning' | 'critical' | 'unknown';

interface ComplianceCardProps {
  title: string;
  status: ComplianceStatus;
  value: string | number;
  target?: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  details?: {
    title: string;
    items: { label: string; value: string | number }[];
    actions?: { label: string; onClick: () => void }[];
  };
}

const statusStyles: Record<ComplianceStatus, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeText: string;
  glow: string;
}> = {
  compliant: {
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    glow: 'shadow-emerald-100',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100',
    badgeText: 'text-amber-700',
    glow: 'shadow-amber-100',
  },
  critical: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badge: 'bg-red-100',
    badgeText: 'text-red-700',
    glow: 'shadow-red-100',
  },
  unknown: {
    bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
    border: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
    badge: 'bg-gray-100',
    badgeText: 'text-gray-600',
    glow: 'shadow-gray-100',
  },
};

const statusLabels: Record<ComplianceStatus, string> = {
  compliant: 'Compliant',
  warning: 'At Risk',
  critical: 'Non-Compliant',
  unknown: 'Unknown',
};

const statusIcons: Record<ComplianceStatus, React.ReactNode> = {
  compliant: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  critical: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  unknown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function ComplianceCard({
  title,
  status,
  value,
  target,
  subtitle,
  icon,
  onClick,
  details,
}: ComplianceCardProps) {
  const [showModal, setShowModal] = useState(false);
  const styles = statusStyles[status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (details) {
      setShowModal(true);
    }
  };

  return (
    <>
      <div
        className={clsx(
          'relative rounded-2xl border p-5 transition-all duration-300',
          styles.bg,
          styles.border,
          (onClick || details) && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
          `shadow-sm ${styles.glow}`
        )}
        onClick={handleClick}
      >
        {/* Status indicator pulse for critical items */}
        {status === 'critical' && (
          <div className="absolute top-3 right-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            styles.iconBg,
            styles.iconColor
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {target && (
                <span className="text-sm text-gray-400">/ {target}</span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-4 flex items-center justify-between">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            styles.badge,
            styles.badgeText
          )}>
            {statusIcons[status]}
            {statusLabels[status]}
          </span>
          {(onClick || details) && (
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && details && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
            
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={clsx(
                'px-6 py-4 rounded-t-2xl border-b',
                styles.bg,
                styles.border
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      styles.iconBg,
                      styles.iconColor
                    )}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{details.title}</h3>
                      <span className={clsx(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        styles.badgeText
                      )}>
                        {statusIcons[status]}
                        {statusLabels[status]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4">
                <dl className="space-y-3">
                  {details.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <dt className="text-sm text-gray-500">{item.label}</dt>
                      <dd className="text-sm font-semibold text-gray-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Modal Actions */}
              {details.actions && details.actions.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
                  <div className="flex flex-col gap-2">
                    {details.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          action.onClick();
                          setShowModal(false);
                        }}
                        className={clsx(
                          'w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          index === 0
                            ? 'bg-hubzone-600 text-white hover:bg-hubzone-700'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { ComplianceCard };


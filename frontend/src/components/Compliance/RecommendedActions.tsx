import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: ActionPriority;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

interface RecommendedActionsProps {
  actions: RecommendedAction[];
  title?: string;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  onActionComplete?: (actionId: string) => void;
}

const priorityStyles: Record<ActionPriority, {
  bg: string;
  border: string;
  icon: string;
  badge: string;
  badgeText: string;
  impactBg: string;
  impactText: string;
}> = {
  critical: {
    bg: 'bg-red-50 hover:bg-red-100/70',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100',
    badgeText: 'text-red-700',
    impactBg: 'bg-red-600',
    impactText: 'text-white',
  },
  high: {
    bg: 'bg-amber-50 hover:bg-amber-100/70',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    badge: 'bg-amber-100',
    badgeText: 'text-amber-700',
    impactBg: 'bg-amber-500',
    impactText: 'text-white',
  },
  medium: {
    bg: 'bg-blue-50 hover:bg-blue-100/70',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100',
    badgeText: 'text-blue-700',
    impactBg: 'bg-blue-500',
    impactText: 'text-white',
  },
  low: {
    bg: 'bg-gray-50 hover:bg-gray-100/70',
    border: 'border-gray-200',
    icon: 'text-gray-500',
    badge: 'bg-gray-100',
    badgeText: 'text-gray-600',
    impactBg: 'bg-gray-500',
    impactText: 'text-white',
  },
};

const priorityLabels: Record<ActionPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const priorityIcons: Record<ActionPriority, React.ReactNode> = {
  critical: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  high: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  medium: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  low: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const priorityOrder: Record<ActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function RecommendedActions({
  actions,
  title = 'Recommended Actions',
  maxItems = 5,
  showViewAll = false,
  viewAllLink = '/compliance/actions',
  onActionComplete,
}: RecommendedActionsProps) {
  // Sort by priority
  const sortedActions = [...actions].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  
  const displayedActions = sortedActions.slice(0, maxItems);
  const hasMore = actions.length > maxItems;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-hubzone-100 text-hubzone-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{actions.length} action{actions.length !== 1 ? 's' : ''} pending</p>
          </div>
        </div>
        {showViewAll && hasMore && (
          <Link
            to={viewAllLink}
            className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
          >
            View all
          </Link>
        )}
      </div>

      {/* Actions list */}
      <div className="divide-y divide-gray-100">
        {displayedActions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">All caught up!</p>
            <p className="text-sm text-gray-500 mt-1">No pending actions at this time</p>
          </div>
        ) : (
          displayedActions.map((action, index) => {
            const styles = priorityStyles[action.priority];
            
            return (
              <div
                key={action.id}
                className={clsx(
                  'px-5 py-4 transition-all duration-200',
                  styles.bg,
                  'animate-in fade-in slide-in-from-left-4',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex gap-4">
                  {/* Priority Icon */}
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
                    styles.bg,
                    styles.border,
                    styles.icon
                  )}>
                    {action.icon || priorityIcons[action.priority]}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {action.title}
                          </h4>
                          <span className={clsx(
                            'px-2 py-0.5 rounded-full text-xs font-semibold',
                            styles.badge,
                            styles.badgeText
                          )}>
                            {priorityLabels[action.priority]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Impact and Action */}
                    <div className="flex items-center justify-between mt-3 gap-4">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'px-2 py-1 rounded-md text-xs font-medium',
                          styles.impactBg,
                          styles.impactText
                        )}>
                          Impact
                        </span>
                        <span className="text-xs text-gray-600">{action.impact}</span>
                      </div>
                      
                      {(action.actionLink || action.onAction) && (
                        action.actionLink ? (
                          <Link
                            to={action.actionLink}
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
                              'shadow-sm'
                            )}
                          >
                            {action.actionLabel || 'Take Action'}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ) : (
                          <button
                            onClick={() => {
                              action.onAction?.();
                              onActionComplete?.(action.id);
                            }}
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
                              'shadow-sm'
                            )}
                          >
                            {action.actionLabel || 'Take Action'}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {hasMore && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <Link
            to={viewAllLink}
            className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700 flex items-center gap-1"
          >
            View {actions.length - maxItems} more action{actions.length - maxItems !== 1 ? 's' : ''}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

export { RecommendedActions };


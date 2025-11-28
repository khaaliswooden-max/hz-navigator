import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

type EmptyStateVariant = 
  | 'default'
  | 'no-data'
  | 'no-results'
  | 'no-employees'
  | 'no-businesses'
  | 'no-documents'
  | 'no-alerts'
  | 'error'
  | 'maintenance';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  /** Pre-defined variant with matching illustration */
  variant?: EmptyStateVariant;
  /** Custom title (overrides variant title) */
  title?: string;
  /** Custom description (overrides variant description) */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Custom icon/illustration (overrides variant) */
  icon?: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

// Pre-defined content for variants
const variantContent: Record<EmptyStateVariant, { title: string; description: string }> = {
  default: {
    title: 'No data available',
    description: 'There is nothing to display at the moment.',
  },
  'no-data': {
    title: 'No data yet',
    description: 'Data will appear here once it becomes available.',
  },
  'no-results': {
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria to find what you\'re looking for.',
  },
  'no-employees': {
    title: 'No employees yet',
    description: 'Add your first employee to start tracking HUBZone residency compliance.',
  },
  'no-businesses': {
    title: 'No businesses registered',
    description: 'Register a business to begin managing your HUBZone certification.',
  },
  'no-documents': {
    title: 'No documents uploaded',
    description: 'Upload documents to support your HUBZone certification application.',
  },
  'no-alerts': {
    title: 'All caught up!',
    description: 'You have no pending alerts or notifications at this time.',
  },
  error: {
    title: 'Unable to load data',
    description: 'Something went wrong while loading. Please try again.',
  },
  maintenance: {
    title: 'Under maintenance',
    description: 'This feature is currently being updated. Please check back later.',
  },
};

// SVG Illustrations for each variant
const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  default: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="60" y="70" width="80" height="60" rx="8" className="fill-gray-200" />
      <rect x="70" y="82" width="40" height="4" rx="2" className="fill-gray-300" />
      <rect x="70" y="92" width="60" height="4" rx="2" className="fill-gray-300" />
      <rect x="70" y="102" width="50" height="4" rx="2" className="fill-gray-300" />
      <rect x="70" y="112" width="30" height="4" rx="2" className="fill-gray-300" />
    </svg>
  ),
  'no-data': (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-hubzone-50" />
      <path d="M60 120 L100 80 L140 120 L140 140 L60 140 Z" className="fill-hubzone-100" />
      <circle cx="130" cy="70" r="15" className="fill-hubzone-200" />
      <rect x="75" y="95" width="50" height="30" rx="4" className="fill-hubzone-200" />
      <path d="M85 110 L95 120 L115 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-hubzone-400" />
    </svg>
  ),
  'no-results': (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-amber-50" />
      <circle cx="90" cy="90" r="35" className="stroke-amber-300" strokeWidth="8" fill="none" />
      <path d="M115 115 L140 140" className="stroke-amber-400" strokeWidth="8" strokeLinecap="round" />
      <path d="M80 85 L100 85" className="stroke-amber-300" strokeWidth="4" strokeLinecap="round" />
      <path d="M80 95 L100 95" className="stroke-amber-300" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  'no-employees': (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-hubzone-50" />
      <circle cx="100" cy="80" r="25" className="fill-hubzone-200" />
      <path d="M60 140 C60 110 140 110 140 140" className="fill-hubzone-200" />
      <circle cx="140" cy="130" r="20" className="fill-verified-100 stroke-verified-300" strokeWidth="3" />
      <path d="M133 130 L138 135 L148 125" className="stroke-verified-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'no-businesses': (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-federal-50" />
      <rect x="60" y="80" width="80" height="60" rx="4" className="fill-federal-100" />
      <rect x="70" y="70" width="60" height="20" className="fill-federal-200" />
      <rect x="75" y="95" width="20" height="25" className="fill-federal-200" />
      <rect x="105" y="95" width="20" height="15" className="fill-federal-200" />
      <rect x="105" y="115" width="20" height="15" className="fill-federal-200" />
    </svg>
  ),
  'no-documents': (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-gray-100" />
      <rect x="70" y="55" width="60" height="80" rx="4" className="fill-white stroke-gray-300" strokeWidth="2" />
      <path d="M110 55 L130 75 L130 135 L70 135 L70 55 L110 55 Z" className="fill-gray-50 stroke-gray-300" strokeWidth="2" />
      <path d="M110 55 L110 75 L130 75" className="stroke-gray-300" strokeWidth="2" />
      <rect x="80" y="85" width="40" height="4" rx="2" className="fill-gray-200" />
      <rect x="80" y="95" width="35" height="4" rx="2" className="fill-gray-200" />
      <rect x="80" y="105" width="30" height="4" rx="2" className="fill-gray-200" />
    </svg>
  ),
  'no-alerts': (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-verified-50" />
      <circle cx="100" cy="100" r="40" className="fill-verified-100" />
      <path d="M80 100 L95 115 L125 85" className="stroke-verified-500" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-red-50" />
      <circle cx="100" cy="100" r="40" className="fill-red-100" />
      <path d="M85 85 L115 115 M115 85 L85 115" className="stroke-red-500" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  maintenance: (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" className="fill-amber-50" />
      <path d="M100 60 L110 90 L140 90 L115 110 L125 140 L100 120 L75 140 L85 110 L60 90 L90 90 Z" className="fill-amber-200" />
      <circle cx="100" cy="100" r="15" className="fill-amber-300" />
      <rect x="95" y="100" width="10" height="25" className="fill-amber-400" />
      <rect x="93" y="120" width="14" height="8" rx="2" className="fill-amber-400" />
    </svg>
  ),
};

/**
 * EmptyState - Displays friendly empty states with illustrations
 * 
 * @example
 * // No employees with action
 * <EmptyState
 *   variant="no-employees"
 *   action={{ label: "Add Employee", onClick: () => {} }}
 * />
 * 
 * // Custom content
 * <EmptyState
 *   title="No matching records"
 *   description="Try a different search term"
 *   action={{ label: "Clear filters", onClick: clearFilters }}
 * />
 */
export function EmptyState({
  variant = 'default',
  title,
  description,
  action,
  secondaryAction,
  icon,
  className,
  compact = false,
}: EmptyStateProps) {
  const content = variantContent[variant];
  const displayTitle = title ?? content.title;
  const displayDescription = description ?? content.description;
  const displayIcon = icon ?? illustrations[variant];

  const renderAction = (actionConfig: EmptyStateAction, isPrimary: boolean) => {
    const buttonClass = clsx(
      'inline-flex items-center gap-2',
      isPrimary ? 'btn-primary' : 'btn-secondary',
      compact && 'text-sm px-3 py-1.5'
    );

    const content = (
      <>
        {actionConfig.icon}
        {actionConfig.label}
      </>
    );

    if (actionConfig.href) {
      return (
        <Link to={actionConfig.href} className={buttonClass}>
          {content}
        </Link>
      );
    }

    return (
      <button onClick={actionConfig.onClick} className={buttonClass}>
        {content}
      </button>
    );
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        'animate-fade-in',
        className
      )}
    >
      {/* Illustration */}
      <div className={clsx(compact ? 'w-24 h-24 mb-4' : 'w-40 h-40 mb-6')}>
        {displayIcon}
      </div>

      {/* Title */}
      <h3
        className={clsx(
          'font-display font-bold text-gray-900',
          compact ? 'text-lg mb-1' : 'text-xl mb-2'
        )}
      >
        {displayTitle}
      </h3>

      {/* Description */}
      <p
        className={clsx(
          'text-gray-500 max-w-sm',
          compact ? 'text-sm mb-4' : 'text-base mb-6'
        )}
      >
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && renderAction(action, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  );
}

/**
 * TableEmptyState - Compact empty state for tables
 */
export function TableEmptyState({
  message = 'No records found',
  colSpan,
}: {
  message?: string;
  colSpan?: number;
}) {
  const content = (
    <div className="py-12 text-center">
      <svg
        className="w-12 h-12 mx-auto text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }

  return content;
}

/**
 * SearchEmptyState - Empty state specifically for search results
 */
export function SearchEmptyState({
  query,
  onClear,
  suggestions,
}: {
  query: string;
  onClear?: () => void;
  suggestions?: string[];
}) {
  return (
    <EmptyState
      variant="no-results"
      title={`No results for "${query}"`}
      description="Try checking your spelling or using different keywords."
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
      icon={
        suggestions && suggestions.length > 0 ? (
          <div className="text-left w-full max-w-xs">
            <p className="text-sm text-gray-500 mb-2">Did you mean:</p>
            <ul className="space-y-1">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button className="text-hubzone-600 hover:underline text-sm">
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    />
  );
}

export default EmptyState;


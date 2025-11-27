import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  to?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
  columns?: 2 | 3 | 4;
}

const variantStyles = {
  default: {
    bg: 'bg-gray-50 hover:bg-gray-100',
    icon: 'bg-white text-gray-600 border border-gray-200',
    text: 'text-gray-900',
  },
  primary: {
    bg: 'bg-hubzone-50 hover:bg-hubzone-100',
    icon: 'bg-hubzone-100 text-hubzone-600',
    text: 'text-hubzone-900',
  },
  success: {
    bg: 'bg-verified-50 hover:bg-verified-100',
    icon: 'bg-verified-100 text-verified-600',
    text: 'text-verified-900',
  },
  warning: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-900',
  },
};

export default function QuickActions({
  actions,
  title,
  layout = 'grid',
  columns = 2,
}: QuickActionsProps) {
  const renderAction = (action: QuickAction) => {
    const styles = variantStyles[action.variant || 'default'];
    
    const content = (
      <div className={clsx(
        'flex items-center gap-3 p-4 rounded-xl transition-all',
        styles.bg,
        action.disabled && 'opacity-50 cursor-not-allowed',
        !action.disabled && 'cursor-pointer'
      )}>
        <div className={clsx(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          styles.icon
        )}>
          {action.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-medium', styles.text)}>
            {action.label}
          </p>
          {action.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {action.description}
            </p>
          )}
        </div>
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );

    if (action.disabled) {
      return <div key={action.id}>{content}</div>;
    }

    if (action.to) {
      return (
        <Link key={action.id} to={action.to}>
          {content}
        </Link>
      );
    }

    return (
      <button key={action.id} onClick={action.onClick} className="w-full text-left">
        {content}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className={clsx(
        layout === 'horizontal' && 'flex flex-wrap gap-3',
        layout === 'vertical' && 'flex flex-col gap-3',
        layout === 'grid' && 'grid gap-3',
        layout === 'grid' && columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        layout === 'grid' && columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        layout === 'grid' && columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      )}>
        {actions.map(renderAction)}
      </div>
    </div>
  );
}


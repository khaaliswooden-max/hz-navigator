import { clsx } from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

const colorStyles = {
  default: {
    bg: 'bg-white',
    icon: 'bg-gray-100 text-gray-600',
    accent: 'text-hubzone-600',
  },
  blue: {
    bg: 'bg-white',
    icon: 'bg-hubzone-100 text-hubzone-600',
    accent: 'text-hubzone-600',
  },
  green: {
    bg: 'bg-white',
    icon: 'bg-verified-100 text-verified-600',
    accent: 'text-verified-600',
  },
  amber: {
    bg: 'bg-white',
    icon: 'bg-amber-100 text-amber-600',
    accent: 'text-amber-600',
  },
  red: {
    bg: 'bg-white',
    icon: 'bg-red-100 text-red-600',
    accent: 'text-red-600',
  },
  purple: {
    bg: 'bg-white',
    icon: 'bg-purple-100 text-purple-600',
    accent: 'text-purple-600',
  },
};

export default function StatCard({
  label,
  value,
  change,
  trend = 'neutral',
  icon,
  color = 'default',
  size = 'md',
}: StatCardProps) {
  const styles = colorStyles[color];

  const getTrendIcon = () => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-verified-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className={clsx(
      styles.bg,
      'rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow',
      size === 'sm' && 'p-4',
      size === 'md' && 'p-5',
      size === 'lg' && 'p-6'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={clsx(
            'font-medium text-gray-500',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-sm'
          )}>
            {label}
          </p>
          <p className={clsx(
            'font-bold text-gray-900 mt-1',
            size === 'sm' && 'text-xl',
            size === 'md' && 'text-2xl',
            size === 'lg' && 'text-3xl'
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className={clsx('flex items-center gap-1 mt-2', getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{change}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx(
            'rounded-lg flex items-center justify-center flex-shrink-0',
            styles.icon,
            size === 'sm' && 'w-8 h-8',
            size === 'md' && 'w-10 h-10',
            size === 'lg' && 'w-12 h-12'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}


import { clsx } from 'clsx';

interface ProgressCardProps {
  title: string;
  value: number;
  max: number;
  label?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  icon?: React.ReactNode;
}

const colorStyles = {
  blue: {
    bar: 'bg-hubzone-500',
    track: 'bg-hubzone-100',
    text: 'text-hubzone-600',
  },
  green: {
    bar: 'bg-verified-500',
    track: 'bg-verified-100',
    text: 'text-verified-600',
  },
  amber: {
    bar: 'bg-amber-500',
    track: 'bg-amber-100',
    text: 'text-amber-600',
  },
  red: {
    bar: 'bg-red-500',
    track: 'bg-red-100',
    text: 'text-red-600',
  },
  purple: {
    bar: 'bg-purple-500',
    track: 'bg-purple-100',
    text: 'text-purple-600',
  },
};

export default function ProgressCard({
  title,
  value,
  max,
  label,
  color = 'blue',
  size = 'md',
  showPercentage = true,
  icon,
}: ProgressCardProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const styles = colorStyles[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-gray-500">{title}</h4>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={clsx(
              'font-bold text-gray-900',
              size === 'sm' && 'text-xl',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-3xl'
            )}>
              {value.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm">/ {max.toLocaleString()}</span>
          </div>
          {label && (
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          )}
        </div>
        {icon && (
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            styles.track,
            styles.text
          )}>
            {icon}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          {showPercentage && (
            <span className={clsx('text-xs font-medium', styles.text)}>
              {percentage}%
            </span>
          )}
        </div>
        <div className={clsx('h-2 rounded-full overflow-hidden', styles.track)}>
          <div
            className={clsx('h-full rounded-full transition-all duration-500', styles.bar)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}


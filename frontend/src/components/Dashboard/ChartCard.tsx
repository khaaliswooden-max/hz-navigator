import { clsx } from 'clsx';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  height?: string | number;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
  height = 300,
}: ChartCardProps) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border border-gray-200 shadow-sm p-5',
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">{action}</div>
        )}
      </div>

      {/* Chart container */}
      <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        {children}
      </div>
    </div>
  );
}


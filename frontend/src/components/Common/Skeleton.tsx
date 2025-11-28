import { clsx } from 'clsx';

interface SkeletonProps {
  /** Width of the skeleton (CSS value or Tailwind class) */
  width?: string;
  /** Height of the skeleton (CSS value or Tailwind class) */
  height?: string;
  /** Shape variant */
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
  /** Additional class name */
  className?: string;
}

/**
 * Skeleton - Loading placeholder component
 * 
 * @example
 * // Text skeleton
 * <Skeleton variant="text" width="200px" />
 * 
 * // Avatar skeleton
 * <Skeleton variant="circular" width="40px" height="40px" />
 * 
 * // Card skeleton
 * <Skeleton variant="rounded" height="200px" />
 */
export function Skeleton({
  width,
  height,
  variant = 'text',
  animation = 'pulse',
  className,
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    text: 'rounded h-4',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonText - Multiple lines of text skeleton
 */
export function SkeletonText({
  lines = 3,
  className,
  lastLineWidth = '70%',
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar - Avatar placeholder
 */
export function SkeletonAvatar({ 
  size = 'md' 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return <Skeleton variant="circular" className={sizes[size]} />;
}

/**
 * SkeletonButton - Button placeholder
 */
export function SkeletonButton({ 
  size = 'md',
  width = 'w-24',
}: { 
  size?: 'sm' | 'md' | 'lg';
  width?: string;
}) {
  const heights = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  return <Skeleton variant="rounded" className={clsx(heights[size], width)} />;
}

/**
 * SkeletonCard - Card placeholder with typical card layout
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 p-6 animate-pulse', className)}>
      <div className="flex items-start gap-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="60%" height="20px" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
      <div className="mt-4 flex gap-2">
        <SkeletonButton />
        <SkeletonButton width="w-20" />
      </div>
    </div>
  );
}

/**
 * SkeletonTable - Table rows placeholder
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      {showHeader && (
        <div className="border-b border-gray-200 pb-3 mb-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                variant="text"
                height="12px"
                className={clsx(
                  i === 0 ? 'w-1/4' : 'flex-1',
                  'bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 py-2">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                variant="text"
                className={clsx(
                  colIndex === 0 ? 'w-1/4' : 'flex-1'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonTableRow - Single table row skeleton (for use in actual tables)
 */
export function SkeletonTableRow({
  columns,
  className,
}: {
  columns: number;
  className?: string;
}) {
  return (
    <tr className={clsx('animate-pulse', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton variant="text" width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  );
}

/**
 * SkeletonStat - Stat card placeholder
 */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 p-5 animate-pulse', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="12px" />
          <Skeleton variant="text" width="40%" height="28px" />
          <Skeleton variant="text" width="50%" height="14px" />
        </div>
        <Skeleton variant="rounded" className="w-10 h-10" />
      </div>
    </div>
  );
}

/**
 * SkeletonChart - Chart placeholder
 */
export function SkeletonChart({
  height = '300px',
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 p-6 animate-pulse',
        className
      )}
    >
      {/* Chart header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton variant="text" width="120px" height="18px" />
          <Skeleton variant="text" width="80px" height="14px" />
        </div>
        <Skeleton variant="rounded" className="w-24 h-8" />
      </div>

      {/* Chart area */}
      <div
        className="bg-gray-100 rounded-lg flex items-end justify-around px-4 pb-4 pt-8"
        style={{ height }}
      >
        {/* Bar chart skeleton */}
        {[65, 45, 80, 55, 70, 40, 60].map((height, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-t w-8"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-around mt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="30px" height="12px" />
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonList - List of items placeholder
 */
export function SkeletonList({
  items = 5,
  showAvatar = true,
  className,
}: {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-4 animate-pulse', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" height="12px" />
          </div>
          <Skeleton variant="rounded" className="w-16 h-6" />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonForm - Form fields placeholder
 */
export function SkeletonForm({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-6 animate-pulse', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" width="80px" height="14px" />
          <Skeleton variant="rounded" height="44px" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <SkeletonButton size="lg" width="w-32" />
        <SkeletonButton size="lg" width="w-24" />
      </div>
    </div>
  );
}

/**
 * SkeletonProfile - User profile placeholder
 */
export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse', className)}>
      {/* Cover */}
      <Skeleton variant="rectangular" height="120px" className="rounded-t-xl" />
      
      {/* Avatar and info */}
      <div className="px-6 pb-6">
        <div className="flex items-end -mt-10 mb-4">
          <div className="rounded-full border-4 border-white">
            <SkeletonAvatar size="xl" />
          </div>
          <div className="ml-4 flex-1 space-y-2 pb-2">
            <Skeleton variant="text" width="150px" height="24px" />
            <Skeleton variant="text" width="100px" height="14px" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export default Skeleton;


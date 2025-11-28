import { clsx } from 'clsx';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerColor = 'primary' | 'white' | 'gray' | 'success' | 'warning' | 'error';

interface LoadingSpinnerProps {
  /** Size variant of the spinner */
  size?: SpinnerSize;
  /** Color variant of the spinner */
  color?: SpinnerColor;
  /** Whether to center the spinner in its container */
  centered?: boolean;
  /** Optional text label to display */
  label?: string;
  /** Position of the label relative to spinner */
  labelPosition?: 'right' | 'bottom';
  /** Additional className for the container */
  className?: string;
  /** Use full-screen overlay mode */
  fullScreen?: boolean;
}

const sizeStyles: Record<SpinnerSize, { spinner: string; label: string }> = {
  xs: { spinner: 'w-3 h-3 border-[2px]', label: 'text-xs' },
  sm: { spinner: 'w-4 h-4 border-2', label: 'text-sm' },
  md: { spinner: 'w-6 h-6 border-2', label: 'text-sm' },
  lg: { spinner: 'w-8 h-8 border-[3px]', label: 'text-base' },
  xl: { spinner: 'w-12 h-12 border-4', label: 'text-lg' },
};

const colorStyles: Record<SpinnerColor, string> = {
  primary: 'border-hubzone-200 border-t-hubzone-600',
  white: 'border-white/30 border-t-white',
  gray: 'border-gray-200 border-t-gray-600',
  success: 'border-verified-200 border-t-verified-600',
  warning: 'border-amber-200 border-t-amber-600',
  error: 'border-red-200 border-t-red-600',
};

/**
 * LoadingSpinner - A reusable loading indicator component
 * 
 * @example
 * // Basic usage
 * <LoadingSpinner />
 * 
 * // With label
 * <LoadingSpinner label="Loading data..." />
 * 
 * // Centered in container
 * <LoadingSpinner centered size="lg" />
 * 
 * // Full screen overlay
 * <LoadingSpinner fullScreen label="Processing..." />
 */
export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  centered = false,
  label,
  labelPosition = 'right',
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const styles = sizeStyles[size];
  
  const spinnerElement = (
    <div
      className={clsx(
        'rounded-full animate-spin',
        styles.spinner,
        colorStyles[color]
      )}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  const content = label ? (
    <div
      className={clsx(
        'flex items-center',
        labelPosition === 'bottom' ? 'flex-col gap-2' : 'flex-row gap-3'
      )}
    >
      {spinnerElement}
      <span
        className={clsx(
          styles.label,
          color === 'white' ? 'text-white' : 'text-gray-600',
          'font-medium'
        )}
      >
        {label}
      </span>
    </div>
  ) : (
    spinnerElement
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
          <LoadingSpinner size="xl" color="primary" />
          {label && (
            <p className="text-gray-700 font-medium text-lg">{label}</p>
          )}
        </div>
      </div>
    );
  }

  if (centered) {
    return (
      <div className={clsx('flex items-center justify-center', className)}>
        {content}
      </div>
    );
  }

  return <div className={clsx('inline-flex', className)}>{content}</div>;
}

/**
 * PageLoadingSpinner - Full page loading state for route transitions
 */
export function PageLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 rounded-full border-4 border-hubzone-100" />
          {/* Spinning ring */}
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-hubzone-600 animate-spin" />
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-hubzone-600 animate-pulse" />
          </div>
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * InlineSpinner - Minimal spinner for inline usage (buttons, text)
 */
export function InlineSpinner({ 
  className,
  light = false 
}: { 
  className?: string;
  light?: boolean;
}) {
  return (
    <svg
      className={clsx(
        'animate-spin h-4 w-4',
        light ? 'text-white' : 'text-current',
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * PulsingDots - Alternative loading indicator with pulsing dots
 */
export function PulsingDots({ 
  color = 'primary',
  size = 'md' 
}: { 
  color?: 'primary' | 'white' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}) {
  const dotSizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
  const gapSizes = { sm: 'gap-1', md: 'gap-1.5', lg: 'gap-2' };
  const colors = {
    primary: 'bg-hubzone-600',
    white: 'bg-white',
    gray: 'bg-gray-500',
  };

  return (
    <div className={clsx('flex items-center', gapSizes[size])}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={clsx(
            'rounded-full animate-pulse',
            dotSizes[size],
            colors[color]
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export default LoadingSpinner;


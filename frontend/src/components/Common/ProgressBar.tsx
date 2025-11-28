import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

type ProgressColor = 'primary' | 'success' | 'warning' | 'error' | 'gray';
type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Color variant */
  color?: ProgressColor;
  /** Size variant */
  size?: ProgressSize;
  /** Show percentage label */
  showLabel?: boolean;
  /** Label position */
  labelPosition?: 'inside' | 'right' | 'top';
  /** Custom label format */
  formatLabel?: (value: number, max: number) => string;
  /** Striped animation */
  striped?: boolean;
  /** Animated stripes */
  animated?: boolean;
  /** Indeterminate progress (loading state) */
  indeterminate?: boolean;
  /** Additional class name */
  className?: string;
}

const colorStyles: Record<ProgressColor, { bar: string; label: string }> = {
  primary: { bar: 'bg-hubzone-600', label: 'text-hubzone-700' },
  success: { bar: 'bg-verified-600', label: 'text-verified-700' },
  warning: { bar: 'bg-amber-500', label: 'text-amber-700' },
  error: { bar: 'bg-red-600', label: 'text-red-700' },
  gray: { bar: 'bg-gray-500', label: 'text-gray-700' },
};

const sizeStyles: Record<ProgressSize, { track: string; insideLabel: string }> = {
  xs: { track: 'h-1', insideLabel: '' },
  sm: { track: 'h-2', insideLabel: '' },
  md: { track: 'h-3', insideLabel: 'text-[10px]' },
  lg: { track: 'h-5', insideLabel: 'text-xs' },
};

/**
 * ProgressBar - Visual progress indicator
 * 
 * @example
 * // Basic usage
 * <ProgressBar value={45} />
 * 
 * // With label
 * <ProgressBar value={75} showLabel labelPosition="right" />
 * 
 * // Indeterminate
 * <ProgressBar indeterminate />
 * 
 * // Custom format
 * <ProgressBar 
 *   value={3} 
 *   max={5} 
 *   formatLabel={(v, m) => `${v} of ${m} completed`}
 *   showLabel 
 * />
 */
export function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  labelPosition = 'right',
  formatLabel,
  striped = false,
  animated = false,
  indeterminate = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const styles = colorStyles[color];
  const sizes = sizeStyles[size];

  const defaultFormat = (v: number, m: number) => 
    m === 100 ? `${Math.round(v)}%` : `${v}/${m}`;
  const label = formatLabel ? formatLabel(value, max) : defaultFormat(value, max);

  const renderBar = () => (
    <div
      className={clsx(
        'relative overflow-hidden rounded-full bg-gray-200',
        sizes.track,
        className
      )}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={clsx(
          'h-full rounded-full transition-all duration-500 ease-out',
          styles.bar,
          striped && 'progress-striped',
          animated && 'progress-animated',
          indeterminate && 'animate-progress-indeterminate w-1/3'
        )}
        style={indeterminate ? undefined : { width: `${percentage}%` }}
      >
        {showLabel && labelPosition === 'inside' && size !== 'xs' && size !== 'sm' && (
          <span className={clsx(
            'absolute inset-0 flex items-center justify-center font-medium text-white',
            sizes.insideLabel
          )}>
            {label}
          </span>
        )}
      </div>
    </div>
  );

  if (showLabel && labelPosition === 'top') {
    return (
      <div>
        <div className="flex justify-between mb-1">
          <span className={clsx('text-sm font-medium', styles.label)}>{label}</span>
        </div>
        {renderBar()}
      </div>
    );
  }

  if (showLabel && labelPosition === 'right') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">{renderBar()}</div>
        <span className={clsx('text-sm font-medium tabular-nums min-w-[3rem] text-right', styles.label)}>
          {label}
        </span>
      </div>
    );
  }

  return renderBar();
}

/**
 * SteppedProgress - Progress with discrete steps
 */
export function SteppedProgress({
  steps,
  currentStep,
  className,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="relative flex items-center justify-center">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  index < currentStep && 'bg-hubzone-600 text-white',
                  index === currentStep && 'bg-hubzone-100 text-hubzone-700 ring-2 ring-hubzone-600',
                  index > currentStep && 'bg-gray-100 text-gray-400'
                )}
              >
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Step label */}
              <span
                className={clsx(
                  'absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium',
                  index <= currentStep ? 'text-gray-700' : 'text-gray-400'
                )}
              >
                {step}
              </span>
            </div>
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2">
                <div
                  className={clsx(
                    'h-full transition-all duration-300',
                    index < currentStep ? 'bg-hubzone-600' : 'bg-gray-200'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CircularProgress - Circular progress indicator
 */
export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = true,
  thickness = 3,
  className,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: ProgressColor;
  showLabel?: boolean;
  thickness?: number;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizes = {
    sm: { container: 'w-12 h-12', label: 'text-xs' },
    md: { container: 'w-16 h-16', label: 'text-sm' },
    lg: { container: 'w-24 h-24', label: 'text-lg' },
    xl: { container: 'w-32 h-32', label: 'text-xl' },
  };

  const strokeColors = {
    primary: 'stroke-hubzone-600',
    success: 'stroke-verified-600',
    warning: 'stroke-amber-500',
    error: 'stroke-red-600',
    gray: 'stroke-gray-500',
  };

  const circumference = 2 * Math.PI * 45; // r=45 for viewBox 100
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={clsx('relative', sizes[size].container, className)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          className="stroke-gray-200"
          strokeWidth={thickness}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          className={clsx(strokeColors[color], 'transition-all duration-500 ease-out')}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('font-semibold', sizes[size].label)}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * UploadProgress - File upload progress with details
 */
export function UploadProgress({
  fileName,
  progress,
  size,
  status = 'uploading',
  onCancel,
  onRetry,
  error,
  className,
}: {
  fileName: string;
  progress: number;
  size?: string;
  status?: 'uploading' | 'complete' | 'error' | 'paused';
  onCancel?: () => void;
  onRetry?: () => void;
  error?: string;
  className?: string;
}) {
  const getStatusColor = (): ProgressColor => {
    switch (status) {
      case 'complete': return 'success';
      case 'error': return 'error';
      case 'paused': return 'warning';
      default: return 'primary';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-5 h-5 text-verified-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200 p-4', className)}>
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
            {size && <span className="text-xs text-gray-500 ml-2">{size}</span>}
          </div>
          
          {status === 'error' && error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <ProgressBar
              value={progress}
              color={getStatusColor()}
              size="sm"
              showLabel
              labelPosition="right"
            />
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {status === 'uploading' && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 text-hubzone-600 hover:text-hubzone-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * useProgress - Hook for managing progress state with simulated progress
 */
export function useProgress(options?: {
  duration?: number;
  onComplete?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    setIsRunning(true);
    setProgress(0);
    
    const duration = options?.duration || 3000;
    const increment = 100 / (duration / 100);
    
    intervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsRunning(false);
          options?.onComplete?.();
          return 100;
        }
        return Math.min(100, prev + increment);
      });
    }, 100);
  };

  const complete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    setIsRunning(false);
    options?.onComplete?.();
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
    setIsRunning(false);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { progress, isRunning, start, complete, reset, setProgress };
}

export default ProgressBar;


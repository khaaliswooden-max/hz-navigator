import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

type MessageType = 'error' | 'warning' | 'info' | 'success';

interface ErrorMessageProps {
  /** The message to display */
  message: string;
  /** Type of message determining color scheme */
  type?: MessageType;
  /** Title/heading for the message */
  title?: string;
  /** Whether the message can be dismissed */
  dismissible?: boolean;
  /** Auto-dismiss after specified milliseconds (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Callback when message is dismissed */
  onDismiss?: () => void;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional class name */
  className?: string;
  /** Compact variant for inline use */
  compact?: boolean;
  /** Icon override (uses default based on type if not provided) */
  icon?: React.ReactNode;
}

const typeStyles: Record<MessageType, {
  container: string;
  icon: string;
  title: string;
  text: string;
  button: string;
  secondaryButton: string;
  dismissButton: string;
}> = {
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700',
    button: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    secondaryButton: 'text-red-700 hover:text-red-800 hover:bg-red-100',
    dismissButton: 'text-red-400 hover:text-red-600 hover:bg-red-100',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
    text: 'text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
    secondaryButton: 'text-amber-700 hover:text-amber-800 hover:bg-amber-100',
    dismissButton: 'text-amber-400 hover:text-amber-600 hover:bg-amber-100',
  },
  info: {
    container: 'bg-hubzone-50 border-hubzone-200',
    icon: 'text-hubzone-500',
    title: 'text-hubzone-800',
    text: 'text-hubzone-700',
    button: 'bg-hubzone-600 hover:bg-hubzone-700 text-white focus:ring-hubzone-500',
    secondaryButton: 'text-hubzone-700 hover:text-hubzone-800 hover:bg-hubzone-100',
    dismissButton: 'text-hubzone-400 hover:text-hubzone-600 hover:bg-hubzone-100',
  },
  success: {
    container: 'bg-verified-50 border-verified-200',
    icon: 'text-verified-500',
    title: 'text-verified-800',
    text: 'text-verified-700',
    button: 'bg-verified-600 hover:bg-verified-700 text-white focus:ring-verified-500',
    secondaryButton: 'text-verified-700 hover:text-verified-800 hover:bg-verified-100',
    dismissButton: 'text-verified-400 hover:text-verified-600 hover:bg-verified-100',
  },
};

const defaultIcons: Record<MessageType, React.ReactNode> = {
  error: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

/**
 * ErrorMessage - Displays error, warning, info, or success messages
 * 
 * @example
 * // Basic error
 * <ErrorMessage message="Something went wrong" type="error" />
 * 
 * // With retry action
 * <ErrorMessage 
 *   message="Failed to load data" 
 *   type="error"
 *   action={{ label: "Retry", onClick: handleRetry }}
 * />
 * 
 * // Auto-dismissing success
 * <ErrorMessage 
 *   message="Changes saved!" 
 *   type="success" 
 *   autoDismiss={3000} 
 * />
 */
export function ErrorMessage({
  message,
  type = 'error',
  title,
  dismissible = false,
  autoDismiss = 0,
  onDismiss,
  action,
  secondaryAction,
  className,
  compact = false,
  icon,
}: ErrorMessageProps) {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    // Wait for animation to complete
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 200);
  }, [onDismiss]);

  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(handleDismiss, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, handleDismiss]);

  if (!visible) return null;

  const styles = typeStyles[type];
  const displayIcon = icon ?? defaultIcons[type];

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200',
          styles.container,
          dismissing && 'opacity-0 translate-x-2',
          className
        )}
        role="alert"
      >
        <span className={clsx('flex-shrink-0', styles.icon)}>{displayIcon}</span>
        <span className={styles.text}>{message}</span>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={clsx('ml-auto p-0.5 rounded', styles.dismissButton)}
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-all duration-200',
        styles.container,
        dismissing && 'opacity-0 -translate-y-2',
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className={clsx('flex-shrink-0', styles.icon)}>{displayIcon}</div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={clsx('text-sm font-semibold mb-1', styles.title)}>
              {title}
            </h3>
          )}
          <p className={clsx('text-sm', styles.text)}>{message}</p>
          
          {(action || secondaryAction) && (
            <div className="mt-4 flex items-center gap-3">
              {action && (
                <button
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={clsx(
                    'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                    styles.button,
                    action.loading && 'opacity-75 cursor-not-allowed'
                  )}
                >
                  {action.loading && (
                    <svg
                      className="animate-spin -ml-0.5 mr-2 h-4 w-4"
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
                  )}
                  {action.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    styles.secondaryButton
                  )}
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
        
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className={clsx(
                'inline-flex rounded-lg p-1.5 transition-colors focus:outline-none',
                styles.dismissButton
              )}
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * InlineError - Compact error for form field validation
 */
export function InlineError({ 
  message, 
  className 
}: { 
  message: string; 
  className?: string;
}) {
  return (
    <p className={clsx('mt-1 text-sm text-red-600 flex items-center gap-1', className)}>
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}

/**
 * NetworkError - Specialized error for network failures
 */
export function NetworkError({
  onRetry,
  retrying = false,
  className,
}: {
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <ErrorMessage
      type="error"
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      action={{
        label: retrying ? 'Retrying...' : 'Retry',
        onClick: onRetry,
        loading: retrying,
      }}
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      }
      className={className}
    />
  );
}

/**
 * ServerError - Specialized error for 500 errors
 */
export function ServerError({
  onRetry,
  retrying = false,
  className,
}: {
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <ErrorMessage
      type="error"
      title="Server Error"
      message="Something went wrong on our end. Our team has been notified and is working to fix the issue."
      action={onRetry ? {
        label: retrying ? 'Retrying...' : 'Try Again',
        onClick: onRetry,
        loading: retrying,
      } : undefined}
      className={className}
    />
  );
}

export default ErrorMessage;


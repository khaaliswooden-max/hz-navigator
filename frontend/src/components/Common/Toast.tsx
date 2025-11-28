import { useState, useEffect, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { useToast, type ToastData, type ToastPosition } from '../../context/ToastContext';

/**
 * ToastContainer - Renders all active toasts
 * Place this component once at the root of your app (usually in App.tsx or layout)
 */
export function ToastContainer() {
  const { toasts, position, removeToast } = useToast();

  const positionClasses: Record<ToastPosition, string> = {
    'top-right': 'top-4 right-4 flex-col',
    'top-left': 'top-4 left-4 flex-col',
    'bottom-right': 'bottom-4 right-4 flex-col-reverse',
    'bottom-left': 'bottom-4 left-4 flex-col-reverse',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 flex-col',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse',
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className={clsx(
        'fixed z-[100] flex gap-2 pointer-events-none max-w-sm w-full',
        positionClasses[position]
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast, index) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={removeToast}
          index={index}
        />
      ))}
    </div>
  );
}

/**
 * Individual toast item
 */
function ToastItem({
  toast,
  onRemove,
  index,
}: {
  toast: ToastData;
  onRemove: (id: string) => void;
  index: number;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0 && !isPaused) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 200);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove, isPaused]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const typeStyles: Record<ToastData['type'], { bg: string; border: string; icon: string; iconBg: string; progress: string }> = {
    success: {
      bg: 'bg-white',
      border: 'border-verified-200',
      icon: 'text-verified-500',
      iconBg: 'bg-verified-100',
      progress: 'bg-verified-500',
    },
    error: {
      bg: 'bg-white',
      border: 'border-red-200',
      icon: 'text-red-500',
      iconBg: 'bg-red-100',
      progress: 'bg-red-500',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-amber-200',
      icon: 'text-amber-500',
      iconBg: 'bg-amber-100',
      progress: 'bg-amber-500',
    },
    info: {
      bg: 'bg-white',
      border: 'border-hubzone-200',
      icon: 'text-hubzone-500',
      iconBg: 'bg-hubzone-100',
      progress: 'bg-hubzone-500',
    },
  };

  const icons: Record<ToastData['type'], ReactNode> = {
    success: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
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
  };

  const styles = typeStyles[toast.type];

  return (
    <div
      className={clsx(
        'w-full rounded-xl border shadow-lg pointer-events-auto overflow-hidden',
        'transition-all duration-200 ease-out',
        styles.bg,
        styles.border,
        isExiting 
          ? 'opacity-0 translate-x-4 scale-95' 
          : 'opacity-100 translate-x-0 scale-100'
      )}
      style={{ 
        animationDelay: `${index * 50}ms`,
        animation: !isExiting ? 'slideInRight 0.3s ease-out' : undefined,
      }}
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx('flex-shrink-0 rounded-full p-1.5', styles.iconBg, styles.icon)}>
            {icons[toast.type]}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900 mb-0.5">{toast.title}</p>
            )}
            <p className="text-sm text-gray-600 leading-relaxed">
              {toast.message}
            </p>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  handleDismiss();
                }}
                className="mt-2 text-sm font-medium text-hubzone-600 hover:text-hubzone-700 focus:outline-none"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 rounded-lg hover:bg-gray-100 transition-colors"
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
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className={clsx('h-full transition-all', styles.progress, isPaused && 'animation-play-state: paused')}
            style={{
              animation: `shrink-width ${toast.duration}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  );
}

// CSS keyframes (inject once)
const styleSheet = `
@keyframes shrink-width {
  from { width: 100%; }
  to { width: 0%; }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

if (typeof document !== 'undefined') {
  const styleId = 'toast-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = styleSheet;
    document.head.appendChild(style);
  }
}

export default ToastContainer;

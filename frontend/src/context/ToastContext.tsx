import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: ToastData[];
  position: ToastPosition;
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  // Convenience methods with friendly names
  showSuccess: (message: string, options?: ToastOptions) => string;
  showError: (message: string, options?: ToastOptions) => string;
  showWarning: (message: string, options?: ToastOptions) => string;
  showInfo: (message: string, options?: ToastOptions) => string;
  // Aliases for compatibility
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastIdCounter = 0;

interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
}

/**
 * ToastProvider - Context provider for toast notifications
 * 
 * @example
 * // In your app root
 * <ToastProvider position="top-right">
 *   <App />
 * </ToastProvider>
 * 
 * // In any component
 * const { showSuccess, showError } = useToast();
 * showSuccess('Changes saved successfully!');
 * showError('Failed to save changes');
 */
export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastData, 'id'>): string => {
      const id = `toast-${++toastIdCounter}`;
      const newToast: ToastData = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        return updated.slice(0, maxToasts);
      });

      return id;
    },
    [maxToasts, defaultDuration]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Success toast
  const showSuccess = useCallback(
    (message: string, options?: ToastOptions): string =>
      addToast({ type: 'success', message, ...options }),
    [addToast]
  );

  // Error toast (longer duration by default)
  const showError = useCallback(
    (message: string, options?: ToastOptions): string =>
      addToast({ type: 'error', message, duration: options?.duration ?? 7000, ...options }),
    [addToast]
  );

  // Warning toast
  const showWarning = useCallback(
    (message: string, options?: ToastOptions): string =>
      addToast({ type: 'warning', message, duration: options?.duration ?? 6000, ...options }),
    [addToast]
  );

  // Info toast
  const showInfo = useCallback(
    (message: string, options?: ToastOptions): string =>
      addToast({ type: 'info', message, ...options }),
    [addToast]
  );

  const value: ToastContextValue = {
    toasts,
    position,
    addToast,
    removeToast,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    // Aliases
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functionality
 * 
 * @example
 * const { showSuccess, showError } = useToast();
 * 
 * // On successful save
 * showSuccess('Employee saved successfully!');
 * 
 * // On error with action
 * showError('Failed to save', {
 *   action: { label: 'Retry', onClick: handleRetry }
 * });
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;


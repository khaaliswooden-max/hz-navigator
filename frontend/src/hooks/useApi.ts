import { useState, useCallback, useRef, useEffect } from 'react';

// Error types for categorization
export type ApiErrorType = 
  | 'network'      // Network/connection errors
  | 'timeout'      // Request timeout
  | 'unauthorized' // 401 errors
  | 'forbidden'    // 403 errors
  | 'not_found'    // 404 errors
  | 'validation'   // 400/422 validation errors
  | 'server'       // 500+ server errors
  | 'unknown';     // Unknown errors

export interface ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  data?: unknown;
  retryable: boolean;
}

interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseApiOptions {
  /** Auto-retry on failure */
  retryCount?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Callback when error occurs */
  onError?: (error: ApiError) => void;
  /** Callback on success */
  onSuccess?: <T>(data: T) => void;
  /** Show optimistic update */
  optimisticData?: unknown;
  /** Reset optimistic on error */
  rollbackOnError?: boolean;
}

interface UseApiResult<T, Args extends unknown[]> extends UseApiState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  retry: () => Promise<T | null>;
  /** Cancel ongoing request */
  cancel: () => void;
}

/**
 * Categorize error based on status code or error type
 */
function categorizeError(error: unknown): ApiError {
  // Default error structure
  const apiError: ApiError = {
    name: 'ApiError',
    message: 'An unexpected error occurred',
    type: 'unknown',
    retryable: false,
  };

  if (error instanceof Error) {
    apiError.message = error.message;
    
    // Check for network errors
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      apiError.type = 'network';
      apiError.retryable = true;
      apiError.message = 'Unable to connect to the server. Please check your internet connection.';
    }
    
    // Check for timeout
    if (error.message.includes('timeout') || error.name === 'AbortError') {
      apiError.type = 'timeout';
      apiError.retryable = true;
      apiError.message = 'Request timed out. Please try again.';
    }
  }

  // Handle axios/fetch response errors
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    const response = errorObj.response as Record<string, unknown> | undefined;
    const status = response?.status as number | undefined;
    
    if (status) {
      apiError.status = status;
      
      switch (true) {
        case status === 401:
          apiError.type = 'unauthorized';
          apiError.message = 'Your session has expired. Please log in again.';
          apiError.retryable = false;
          break;
        case status === 403:
          apiError.type = 'forbidden';
          apiError.message = 'You don\'t have permission to perform this action.';
          apiError.retryable = false;
          break;
        case status === 404:
          apiError.type = 'not_found';
          apiError.message = 'The requested resource was not found.';
          apiError.retryable = false;
          break;
        case status === 400 || status === 422:
          apiError.type = 'validation';
          apiError.data = response?.data;
          apiError.message = (response?.data as Record<string, string>)?.message || 'Invalid request data.';
          apiError.retryable = false;
          break;
        case status >= 500:
          apiError.type = 'server';
          apiError.message = 'Something went wrong on our end. Please try again later.';
          apiError.retryable = true;
          break;
      }
    }
  }

  return apiError;
}

/**
 * Custom hook for API calls with loading, error states, and retry logic
 * 
 * @example
 * const { data, isLoading, error, execute, retry } = useApi(fetchUsers, {
 *   retryCount: 3,
 *   onError: (err) => console.error(err),
 * });
 * 
 * // Execute the API call
 * await execute(userId);
 * 
 * // Retry last call
 * await retry();
 */
export function useApi<T, Args extends unknown[] = []>(
  apiFunction: (...args: Args) => Promise<T>,
  options: UseApiOptions = {}
): UseApiResult<T, Args> {
  const {
    retryCount = 0,
    retryDelay = 1000,
    onError,
    onSuccess,
    optimisticData,
    rollbackOnError = true,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: optimisticData as T | null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastArgsRef = useRef<Args | null>(null);
  const retriesRef = useRef(0);
  const previousDataRef = useRef<T | null>(null);

  // Cancel any ongoing request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Cancel any previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      // Store args for retry
      lastArgsRef.current = args;
      retriesRef.current = 0;

      // Store current data for rollback
      previousDataRef.current = state.data;

      // Apply optimistic update if provided
      if (optimisticData !== undefined) {
        setState(prev => ({
          ...prev,
          data: optimisticData as T,
          isLoading: true,
          error: null,
          isError: false,
        }));
      } else {
        setState({
          data: null,
          error: null,
          isLoading: true,
          isSuccess: false,
          isError: false,
        });
      }

      const attemptRequest = async (): Promise<T | null> => {
        try {
          const data = await apiFunction(...args);
          
          setState({
            data,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
          });
          
          onSuccess?.(data);
          return data;
        } catch (error) {
          const apiError = categorizeError(error);
          
          // Check if we should retry
          if (apiError.retryable && retriesRef.current < retryCount) {
            retriesRef.current++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * retriesRef.current));
            return attemptRequest();
          }

          // Rollback optimistic update on error
          if (rollbackOnError && optimisticData !== undefined) {
            setState({
              data: previousDataRef.current,
              error: apiError,
              isLoading: false,
              isSuccess: false,
              isError: true,
            });
          } else {
            setState({
              data: null,
              error: apiError,
              isLoading: false,
              isSuccess: false,
              isError: true,
            });
          }
          
          onError?.(apiError);
          return null;
        }
      };

      return attemptRequest();
    },
    [apiFunction, retryCount, retryDelay, onError, onSuccess, optimisticData, rollbackOnError, state.data]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastArgsRef.current) {
      return execute(...lastArgsRef.current);
    }
    return null;
  }, [execute]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  return { ...state, execute, reset, retry, cancel };
}

/**
 * Hook for mutation operations (POST, PUT, DELETE)
 */
export function useMutation<T, Args extends unknown[] = []>(
  mutationFn: (...args: Args) => Promise<T>,
  options: UseApiOptions & {
    /** Invalidate/refetch after success */
    onSettled?: () => void;
  } = {}
) {
  const { onSettled, ...apiOptions } = options;
  const result = useApi(mutationFn, {
    ...apiOptions,
    onSuccess: (data) => {
      apiOptions.onSuccess?.(data);
      onSettled?.();
    },
    onError: (error) => {
      apiOptions.onError?.(error);
      onSettled?.();
    },
  });

  return {
    ...result,
    mutate: result.execute,
    mutateAsync: result.execute,
  };
}

/**
 * Custom hook for managing form state with validation
 */
export function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      setValues((prev) => ({ ...prev, [name]: value }));
      // Clear error when user types
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback((name: keyof T) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const setFieldValue = useCallback((name: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name: keyof T, touched: boolean = true) => {
    setTouched((prev) => ({ ...prev, [name]: touched }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const resetField = useCallback((name: keyof T) => {
    setValues((prev) => ({ ...prev, [name]: initialValues[name] }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setTouched((prev) => ({ ...prev, [name]: false }));
  }, [initialValues]);

  const validate = useCallback((
    validationFn: (values: T) => Partial<Record<keyof T, string>>
  ): boolean => {
    const validationErrors = validationFn(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values]);

  const getFieldProps = useCallback((name: keyof T) => ({
    name: String(name),
    value: values[name] as string,
    onChange: handleChange(name),
    onBlur: handleBlur(name),
  }), [values, handleChange, handleBlur]);

  const getFieldState = useCallback((name: keyof T) => ({
    error: errors[name],
    touched: touched[name],
    hasError: !!(touched[name] && errors[name]),
  }), [errors, touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    setErrors,
    reset,
    resetField,
    validate,
    getFieldProps,
    getFieldState,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues),
    isValid: Object.keys(errors).length === 0,
  };
}

/**
 * Hook for polling data at intervals
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  options: {
    enabled?: boolean;
    onError?: (error: ApiError) => void;
  } = {}
) {
  const { enabled = true, onError } = options;
  const { data, error, isLoading, execute } = useApi(fetchFn, { onError });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (enabled) {
      // Initial fetch
      execute();
      
      // Set up polling
      intervalRef.current = window.setInterval(() => {
        execute();
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, execute]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!intervalRef.current) {
      execute();
      intervalRef.current = window.setInterval(() => {
        execute();
      }, interval);
    }
  }, [execute, interval]);

  return { data, error, isLoading, stopPolling, startPolling, refetch: execute };
}

export default useApi;

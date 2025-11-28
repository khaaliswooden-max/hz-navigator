import { useState, useCallback, useEffect, useRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { useDebounce } from '../../hooks/usePerformance';

interface DebouncedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Called with debounced value */
  onDebouncedChange: (value: string) => void;
  /** Debounce delay in milliseconds */
  delay?: number;
  /** Show loading indicator while debouncing */
  showLoadingIndicator?: boolean;
  /** Label for accessibility */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
}

/**
 * DebouncedInput - Input with debounced onChange for search/filter operations
 * 
 * @example
 * <DebouncedInput
 *   label="Search businesses"
 *   placeholder="Enter search term..."
 *   onDebouncedChange={(value) => setSearchTerm(value)}
 *   delay={300}
 * />
 */
export function DebouncedInput({
  onDebouncedChange,
  delay = 300,
  showLoadingIndicator = true,
  label,
  error,
  hint,
  className,
  id,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(props.defaultValue?.toString() || '');
  const [isTyping, setIsTyping] = useState(false);
  const debouncedValue = useDebounce(value, delay);
  const inputId = id || useRef(`input-${Math.random().toString(36).slice(2)}`).current;

  // Call the debounced change handler
  useEffect(() => {
    onDebouncedChange(debouncedValue);
    setIsTyping(false);
  }, [debouncedValue, onDebouncedChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setIsTyping(true);
  }, []);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={props.type || 'text'}
          value={value}
          onChange={handleChange}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          aria-invalid={error ? 'true' : undefined}
          className={clsx(
            'block w-full px-4 py-3 rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'placeholder:text-gray-400',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-hubzone-500 focus:ring-hubzone-500',
            showLoadingIndicator && isTyping && 'pr-10',
            className
          )}
        />
        
        {/* Loading indicator */}
        {showLoadingIndicator && isTyping && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
          </div>
        )}
      </div>
      
      {/* Hint text */}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * SearchInput - Specialized search input with icon
 */
interface SearchInputProps extends Omit<DebouncedInputProps, 'type'> {
  /** Accessible label for the search */
  searchLabel?: string;
}

export function SearchInput({
  searchLabel = 'Search',
  placeholder = 'Search...',
  className,
  ...props
}: SearchInputProps) {
  const inputId = useRef(`search-${Math.random().toString(36).slice(2)}`).current;

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {searchLabel}
      </label>
      
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      
      <DebouncedInput
        {...props}
        id={inputId}
        type="search"
        placeholder={placeholder}
        showLoadingIndicator={props.showLoadingIndicator ?? false}
        className={clsx('pl-10', className)}
      />
    </div>
  );
}

export default DebouncedInput;


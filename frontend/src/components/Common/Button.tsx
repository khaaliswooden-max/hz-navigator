import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { clsx } from 'clsx';
import { InlineSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface BaseButtonProps {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Loading state - shows spinner and disables button */
  loading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Icon to display before text */
  leftIcon?: ReactNode;
  /** Icon to display after text */
  rightIcon?: ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
  /** Icon-only button (square aspect ratio) */
  iconOnly?: boolean;
  /** Additional class name */
  className?: string;
  /** Button children */
  children?: ReactNode;
}

type ButtonProps = BaseButtonProps & 
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps>;

type ButtonLinkProps = BaseButtonProps & 
  Omit<LinkProps, keyof BaseButtonProps>;

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-hubzone-600 text-white hover:bg-hubzone-700 focus:ring-hubzone-500 shadow-sm',
  secondary: 'bg-white text-hubzone-600 border-2 border-hubzone-600 hover:bg-hubzone-50 focus:ring-hubzone-500',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  success: 'bg-verified-600 text-white hover:bg-verified-700 focus:ring-verified-500 shadow-sm',
  outline: 'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
};

const sizeStyles: Record<ButtonSize, { button: string; icon: string; iconOnly: string }> = {
  xs: { 
    button: 'px-2.5 py-1 text-xs gap-1', 
    icon: 'w-3 h-3',
    iconOnly: 'w-6 h-6 p-0',
  },
  sm: { 
    button: 'px-3 py-1.5 text-sm gap-1.5', 
    icon: 'w-4 h-4',
    iconOnly: 'w-8 h-8 p-0',
  },
  md: { 
    button: 'px-4 py-2 text-sm gap-2', 
    icon: 'w-4 h-4',
    iconOnly: 'w-10 h-10 p-0',
  },
  lg: { 
    button: 'px-5 py-2.5 text-base gap-2', 
    icon: 'w-5 h-5',
    iconOnly: 'w-12 h-12 p-0',
  },
  xl: { 
    button: 'px-6 py-3 text-lg gap-2.5', 
    icon: 'w-5 h-5',
    iconOnly: 'w-14 h-14 p-0',
  },
};

const disabledStyles = 'opacity-60 cursor-not-allowed pointer-events-none';
const loadingStyles = 'relative cursor-wait';

/**
 * Button - Versatile button component with loading states
 * 
 * @example
 * // Primary button
 * <Button variant="primary">Save Changes</Button>
 * 
 * // Loading state
 * <Button loading loadingText="Saving...">Save</Button>
 * 
 * // With icons
 * <Button leftIcon={<PlusIcon />}>Add Item</Button>
 * 
 * // Icon only
 * <Button iconOnly variant="ghost" aria-label="Settings">
 *   <SettingsIcon />
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly = false,
      className,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;
    const styles = sizeStyles[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          variantStyles[variant],
          iconOnly ? styles.iconOnly : styles.button,
          fullWidth && 'w-full',
          isDisabled && disabledStyles,
          loading && loadingStyles,
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <InlineSpinner 
              light={variant === 'primary' || variant === 'danger' || variant === 'success'} 
              className={styles.icon}
            />
            {loadingText && <span className="ml-2">{loadingText}</span>}
            {!loadingText && children && (
              <span className="opacity-0">{children}</span>
            )}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={clsx('flex-shrink-0', styles.icon)}>
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className={clsx('flex-shrink-0', styles.icon)}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

/**
 * ButtonLink - Button styled as a link (using React Router)
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly = false,
      className,
      children,
      ...props
    },
    ref
  ) {
    const styles = sizeStyles[size];

    return (
      <Link
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          variantStyles[variant],
          iconOnly ? styles.iconOnly : styles.button,
          fullWidth && 'w-full',
          loading && disabledStyles,
          className
        )}
        {...props}
      >
        {leftIcon && (
          <span className={clsx('flex-shrink-0', styles.icon)}>
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && (
          <span className={clsx('flex-shrink-0', styles.icon)}>
            {rightIcon}
          </span>
        )}
      </Link>
    );
  }
);

/**
 * IconButton - Square button optimized for icons
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'iconOnly' | 'leftIcon' | 'rightIcon' | 'loadingText'>
>(function IconButton({ size = 'md', className, children, ...props }, ref) {
  return (
    <Button
      ref={ref}
      size={size}
      iconOnly
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
});

/**
 * ButtonGroup - Group of related buttons
 */
export function ButtonGroup({
  children,
  className,
  attached = false,
}: {
  children: ReactNode;
  className?: string;
  attached?: boolean;
}) {
  if (attached) {
    return (
      <div
        className={clsx(
          'inline-flex rounded-lg overflow-hidden',
          '[&>button]:rounded-none [&>button]:border-r-0 [&>button:last-child]:border-r',
          '[&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg',
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

/**
 * AsyncButton - Button with automatic loading state management
 */
export function AsyncButton({
  onClick,
  loadingText,
  successText,
  errorText,
  children,
  ...props
}: Omit<ButtonProps, 'onClick' | 'loading'> & {
  onClick: () => Promise<void>;
  successText?: string;
  errorText?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    setState('loading');
    try {
      await onClick();
      setState('success');
      // Reset after showing success
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      // Reset after showing error
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const getContent = () => {
    switch (state) {
      case 'loading':
        return loadingText || children;
      case 'success':
        return successText || '✓ Done';
      case 'error':
        return errorText || 'Failed';
      default:
        return children;
    }
  };

  const getVariant = (): ButtonVariant => {
    if (state === 'success') return 'success';
    if (state === 'error') return 'danger';
    return props.variant || 'primary';
  };

  return (
    <Button
      {...props}
      variant={getVariant()}
      loading={state === 'loading'}
      onClick={handleClick}
      disabled={state === 'loading'}
    >
      {getContent()}
    </Button>
  );
}

// Need to import useState for AsyncButton
import { useState } from 'react';

export default Button;


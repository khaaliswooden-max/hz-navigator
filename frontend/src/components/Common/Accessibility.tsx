import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { clsx } from 'clsx';

// ============================================
// Skip Links Component
// ============================================

interface SkipLink {
  id: string;
  label: string;
}

const defaultSkipLinks: SkipLink[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'main-navigation', label: 'Skip to navigation' },
];

/**
 * SkipLinks - Provides skip navigation for screen readers and keyboard users
 * 
 * @example
 * <SkipLinks links={[
 *   { id: 'main-content', label: 'Skip to main content' },
 *   { id: 'search', label: 'Skip to search' }
 * ]} />
 */
export function SkipLinks({ links = defaultSkipLinks }: { links?: SkipLink[] }) {
  return (
    <div className="skip-links">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="skip-link"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// ============================================
// Focus Trap Component
// ============================================

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  onEscape?: () => void;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

/**
 * FocusTrap - Traps focus within a container (for modals, dialogs)
 * 
 * @example
 * <FocusTrap active={isModalOpen} onEscape={closeModal}>
 *   <Modal>...</Modal>
 * </FocusTrap>
 */
export function FocusTrap({
  children,
  active = true,
  onEscape,
  restoreFocus = true,
  autoFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previously focused element
  useEffect(() => {
    if (active && restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, restoreFocus]);

  // Auto-focus first focusable element
  useEffect(() => {
    if (active && autoFocus && containerRef.current) {
      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [active, autoFocus]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active) return;

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    },
    [active, onEscape]
  );

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

// ============================================
// Live Region / Announcer for Screen Readers
// ============================================

interface AnnouncerContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | undefined>(undefined);

/**
 * A11yAnnouncerProvider - Provides screen reader announcements
 * 
 * @example
 * // In App.tsx
 * <A11yAnnouncerProvider>
 *   <App />
 * </A11yAnnouncerProvider>
 * 
 * // In any component
 * const { announce } = useAnnounce();
 * announce('Changes saved successfully');
 */
export function A11yAnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 100);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 100);
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Polite live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive live region */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnounce must be used within A11yAnnouncerProvider');
  }
  return context;
}

// ============================================
// Visually Hidden Component
// ============================================

/**
 * VisuallyHidden - Hides content visually but keeps it accessible to screen readers
 * 
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
}: {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}) {
  return <Component className="sr-only">{children}</Component>;
}

// ============================================
// Roving Tab Index Hook
// ============================================

/**
 * useRovingTabIndex - Implements roving tabindex for keyboard navigation
 * 
 * @example
 * const { getTabProps, focusedIndex, setFocusedIndex } = useRovingTabIndex({
 *   items: menuItems,
 *   orientation: 'vertical'
 * });
 * 
 * items.map((item, index) => (
 *   <button {...getTabProps(index)}>{item.label}</button>
 * ))
 */
export function useRovingTabIndex({
  itemCount,
  orientation = 'horizontal',
  loop = true,
  initialIndex = 0,
}: {
  itemCount: number;
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  initialIndex?: number;
}) {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const setRef = useCallback((index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

      let newIndex = focusedIndex;

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          newIndex = focusedIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? itemCount - 1 : 0;
          }
          break;
        case nextKey:
          e.preventDefault();
          newIndex = focusedIndex + 1;
          if (newIndex >= itemCount) {
            newIndex = loop ? 0 : itemCount - 1;
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = itemCount - 1;
          break;
        default:
          return;
      }

      setFocusedIndex(newIndex);
      itemRefs.current[newIndex]?.focus();
    },
    [focusedIndex, itemCount, loop, orientation]
  );

  const getTabProps = useCallback(
    (index: number) => ({
      ref: setRef(index),
      tabIndex: index === focusedIndex ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
      onFocus: () => setFocusedIndex(index),
    }),
    [focusedIndex, handleKeyDown, setRef]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    getTabProps,
  };
}

// ============================================
// Focus Visible Hook
// ============================================

/**
 * useFocusVisible - Detects keyboard vs mouse focus
 * 
 * @example
 * const { isFocusVisible, focusProps } = useFocusVisible();
 * <button {...focusProps} className={isFocusVisible ? 'focus-visible' : ''}>
 *   Click me
 * </button>
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hadKeyboardEvent = useRef(false);

  useEffect(() => {
    const onKeyDown = () => {
      hadKeyboardEvent.current = true;
    };

    const onPointerDown = () => {
      hadKeyboardEvent.current = false;
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  const focusProps = {
    onFocus: () => {
      setIsFocused(true);
      if (hadKeyboardEvent.current) {
        setIsFocusVisible(true);
      }
    },
    onBlur: () => {
      setIsFocused(false);
      setIsFocusVisible(false);
    },
  };

  return { isFocused, isFocusVisible, focusProps };
}

// ============================================
// Keyboard Shortcut Hook
// ============================================

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
}

/**
 * useKeyboardShortcuts - Register and handle keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', ctrl: true, callback: openSearch, description: 'Open search' },
 *   { key: 'Escape', callback: closeModal },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !shortcut.ctrl || (e.ctrlKey || e.metaKey);
        const matchesAlt = !shortcut.alt || e.altKey;
        const matchesShift = !shortcut.shift || e.shiftKey;
        const matchesMeta = !shortcut.meta || e.metaKey;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift && matchesMeta) {
          e.preventDefault();
          shortcut.callback();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// ============================================
// Accessible Icon Button
// ============================================

interface IconButtonA11yProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'danger';
}

/**
 * IconButtonA11y - Accessible icon button with proper labeling
 */
export function IconButtonA11y({
  icon,
  label,
  onClick,
  disabled = false,
  className,
  size = 'md',
  variant = 'default',
}: IconButtonA11yProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    md: 'w-10 h-10 min-w-[44px] min-h-[44px]', // 44px for touch targets
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px]',
  };

  const variantClasses = {
    default: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
    primary: 'text-hubzone-600 hover:text-hubzone-700 hover:bg-hubzone-50 focus-visible:ring-hubzone-500',
    danger: 'text-red-500 hover:text-red-700 hover:bg-red-50 focus-visible:ring-red-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {icon}
    </button>
  );
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

/**
 * Generate a unique ID for accessibility attributes
 */
let idCounter = 0;
export function useUniqueId(prefix = 'id'): string {
  const [id] = useState(() => `${prefix}-${++idCounter}`);
  return id;
}

// ============================================
// Reduced Motion Hook
// ============================================

/**
 * useReducedMotion - Respects user's motion preferences
 * 
 * @example
 * const prefersReducedMotion = useReducedMotion();
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================
// High Contrast Mode Hook
// ============================================

/**
 * useHighContrastMode - Detects high contrast mode
 */
export function useHighContrastMode(): boolean {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(forced-colors: active)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
}

export default SkipLinks;


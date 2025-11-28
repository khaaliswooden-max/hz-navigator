import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type RefObject,
} from 'react';

// ============================================
// Debounce Hook
// ============================================

/**
 * useDebounce - Debounces a value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // Only search after user stops typing for 300ms
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounces a callback function
 * 
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToServer(data);
 * }, 500);
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Update callback ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// ============================================
// Throttle Hook
// ============================================

/**
 * useThrottle - Throttles a value
 * 
 * @example
 * const throttledScrollPosition = useThrottle(scrollY, 100);
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;

    if (elapsed >= interval) {
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, interval - elapsed);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// ============================================
// Virtual Scroll Hook
// ============================================

interface VirtualScrollConfig {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

interface VirtualScrollResult {
  virtualItems: { index: number; offsetTop: number }[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollToIndex: (index: number) => void;
}

/**
 * useVirtualScroll - Virtualizes long lists for performance
 * 
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { virtualItems, totalHeight } = useVirtualScroll({
 *   containerRef,
 *   itemCount: 10000,
 *   itemHeight: 48,
 *   containerHeight: 400
 * });
 */
export function useVirtualScroll(
  containerRef: RefObject<HTMLElement>,
  config: VirtualScrollConfig
): VirtualScrollResult {
  const { itemCount, itemHeight, overscan = 5, containerHeight } = config;
  const [scrollTop, setScrollTop] = useState(0);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  // Calculate visible range
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(itemCount - 1, start + visibleCount + 2 * overscan);

    const items: { index: number; offsetTop: number }[] = [];
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return {
      startIndex: start,
      endIndex: end,
      virtualItems: items,
    };
  }, [scrollTop, itemHeight, itemCount, overscan, containerHeight]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = index * itemHeight;
      }
    },
    [containerRef, itemHeight]
  );

  return {
    virtualItems,
    totalHeight: itemCount * itemHeight,
    startIndex,
    endIndex,
    scrollToIndex,
  };
}

// ============================================
// Intersection Observer Hook
// ============================================

interface IntersectionOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

/**
 * useIntersectionObserver - Observes element visibility
 * 
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.5,
 *   triggerOnce: true
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isIntersecting && <LazyContent />}
 *   </div>
 * );
 */
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: IntersectionOptions = {}
): { ref: RefObject<T>; isIntersecting: boolean; entry?: IntersectionObserverEntry } {
  const { root, rootMargin = '0px', threshold = 0, triggerOnce = false } = options;

  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isIntersecting, setIsIntersecting] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || (triggerOnce && triggered.current)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && triggerOnce) {
          triggered.current = true;
          observer.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [root, rootMargin, threshold, triggerOnce]);

  return { ref, isIntersecting, entry };
}

// ============================================
// Lazy Load Hook
// ============================================

/**
 * useLazyLoad - Lazy loads content when visible
 * 
 * @example
 * const { ref, hasLoaded } = useLazyLoad();
 * 
 * return (
 *   <div ref={ref}>
 *     {hasLoaded ? <HeavyComponent /> : <Skeleton />}
 *   </div>
 * );
 */
export function useLazyLoad(rootMargin = '200px') {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    triggerOnce: true,
  });

  return { ref, hasLoaded: isIntersecting };
}

// ============================================
// Window Size Hook
// ============================================

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * useWindowSize - Tracks window dimensions with breakpoints
 * 
 * @example
 * const { width, isMobile, isDesktop } = useWindowSize();
 * 
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setSize({
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
      });
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// ============================================
// Media Query Hook
// ============================================

/**
 * useMediaQuery - Tracks media query matches
 * 
 * @example
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isPrintMode = useMediaQuery('print');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ============================================
// Local Storage Hook
// ============================================

/**
 * useLocalStorage - Persists state to localStorage
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ============================================
// Previous Value Hook
// ============================================

/**
 * usePrevious - Tracks previous value
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ============================================
// Memoized Calculations Hook
// ============================================

/**
 * useMemoizedCalculation - Memoizes expensive calculations
 * 
 * @example
 * const expensiveResult = useMemoizedCalculation(
 *   () => computeExpensiveValue(data),
 *   [data]
 * );
 */
export function useMemoizedCalculation<T>(
  calculation: () => T,
  deps: unknown[]
): T {
  return useMemo(calculation, deps);
}

// ============================================
// Idle Callback Hook
// ============================================

/**
 * useIdleCallback - Runs callback when browser is idle
 * 
 * @example
 * useIdleCallback(() => {
 *   prefetchData();
 * });
 */
export function useIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(callback, options);
      return () => cancelIdleCallback(id);
    } else {
      // Fallback for Safari
      const id = setTimeout(callback, 1);
      return () => clearTimeout(id);
    }
  }, [callback, options]);
}

// ============================================
// Network Status Hook
// ============================================

interface NetworkStatus {
  online: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * useNetworkStatus - Tracks network connectivity
 * 
 * @example
 * const { online, effectiveType, saveData } = useNetworkStatus();
 * 
 * if (!online) return <OfflineMessage />;
 * if (saveData) return <LowDataMode />;
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      
      setStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType as NetworkStatus['effectiveType'],
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    connection?.addEventListener('change', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      connection?.removeEventListener('change', updateNetworkStatus);
    };
  }, []);

  return status;
}

// Type for Network Information API
interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export default useDebounce;


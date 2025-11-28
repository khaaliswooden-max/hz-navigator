// Authentication hooks
export { useAuth } from './useAuth';

// API hooks
export { useApi, type UseApiConfig, type ApiError } from './useApi';

// Performance hooks
export {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useVirtualScroll,
  useIntersectionObserver,
  useLazyLoad,
  useWindowSize,
  useMediaQuery,
  useLocalStorage,
  usePrevious,
  useMemoizedCalculation,
  useIdleCallback,
  useNetworkStatus,
} from './usePerformance';

// Virtual List hooks
export {
  useVirtualList,
  useVirtualTable,
  type VirtualListOptions,
  type VirtualListResult,
  type VirtualTableOptions,
} from './useVirtualList';

// Lazy Image hooks
export {
  useLazyImage,
  useLazyImages,
  useProgressiveImage,
  type LazyImageOptions,
  type LazyImageResult,
  type ProgressiveImageOptions,
} from './useLazyImage';

// Debounce/Throttle hooks (enhanced)
export {
  useLeadingDebounce,
  useThrottledCallback,
  useRAFThrottle,
  useAsyncDebounce,
} from './useDebounce';


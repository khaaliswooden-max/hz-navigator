import React, { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { PageLoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorBoundary } from '../components/Common/ErrorBoundary';

/**
 * Lazy load options
 */
interface LazyLoadOptions {
  /** Custom fallback component while loading */
  fallback?: React.ReactNode;
  /** Minimum delay before showing content (prevents flash) */
  minDelay?: number;
  /** Prefetch on hover */
  prefetch?: boolean;
  /** Error boundary wrapper */
  withErrorBoundary?: boolean;
}

/**
 * Default loading fallback
 */
const DefaultLoadingFallback = () => (
  <PageLoadingSpinner message="Loading..." />
);

/**
 * Creates a lazy-loaded component with loading state and error boundary
 * 
 * @example
 * const Dashboard = lazyLoad(() => import('./pages/Dashboard'));
 * 
 * // With options
 * const MapExplorer = lazyLoad(
 *   () => import('./pages/MapExplorer'),
 *   { minDelay: 300, withErrorBoundary: true }
 * );
 */
export function lazyLoad<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    minDelay = 0,
  } = options;

  // Add minimum delay to prevent loading flash
  const delayedImport = minDelay > 0
    ? () => Promise.all([
        importFn(),
        new Promise(resolve => setTimeout(resolve, minDelay))
      ]).then(([module]) => module)
    : importFn;

  return lazy(delayedImport);
}

/**
 * Wrapper component for lazy-loaded components with Suspense and optional ErrorBoundary
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  withErrorBoundary?: boolean;
}

export function LazyWrapper({
  children,
  fallback = <DefaultLoadingFallback />,
  withErrorBoundary = true,
}: LazyWrapperProps) {
  const content = (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );

  if (withErrorBoundary) {
    return <ErrorBoundary>{content}</ErrorBoundary>;
  }

  return content;
}

/**
 * Preload a lazy component
 * Useful for prefetching on hover or when you know the user will navigate
 * 
 * @example
 * const DashboardLazy = lazyLoad(() => import('./pages/Dashboard'));
 * 
 * // Preload on hover
 * <Link
 *   to="/dashboard"
 *   onMouseEnter={() => preloadComponent(() => import('./pages/Dashboard'))}
 * >
 *   Dashboard
 * </Link>
 */
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<unknown> }>
): void {
  importFn().catch(() => {
    // Silently fail - component will be loaded when needed
  });
}

/**
 * Create a preloadable lazy component
 * Returns both the lazy component and a preload function
 * 
 * @example
 * const [Dashboard, preloadDashboard] = createPreloadableComponent(
 *   () => import('./pages/Dashboard')
 * );
 * 
 * // Use in routes
 * <Route path="/dashboard" element={<Dashboard />} />
 * 
 * // Preload on hover
 * <Link onMouseEnter={preloadDashboard}>Dashboard</Link>
 */
export function createPreloadableComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): [LazyExoticComponent<T>, () => void] {
  let modulePromise: Promise<{ default: T }> | null = null;

  const preload = () => {
    if (!modulePromise) {
      modulePromise = importFn();
    }
  };

  const LazyComponent = lazyLoad(() => {
    if (modulePromise) {
      return modulePromise;
    }
    modulePromise = importFn();
    return modulePromise;
  }, options);

  return [LazyComponent, preload];
}

/**
 * Retry loading a failed lazy component
 */
export function retryLazyLoad<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): () => Promise<{ default: T }> {
  return async () => {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError;
  };
}

/**
 * Lazy load with retry
 * 
 * @example
 * const HeavyComponent = lazyLoadWithRetry(
 *   () => import('./HeavyComponent'),
 *   { retries: 3, retryDelay: 1000 }
 * );
 */
export function lazyLoadWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { retries?: number; retryDelay?: number } = {}
): LazyExoticComponent<T> {
  const { retries = 3, retryDelay = 1000, ...lazyOptions } = options;
  return lazyLoad(retryLazyLoad(importFn, retries, retryDelay), lazyOptions);
}

export default lazyLoad;


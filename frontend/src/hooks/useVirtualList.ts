/**
 * Virtual List Hook
 * 
 * Implements virtual scrolling for large lists to improve performance.
 * Only renders items that are visible in the viewport.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number; // Extra items to render above/below visible area
  containerHeight?: number;
}

export interface VirtualListResult<T> {
  virtualItems: Array<{
    index: number;
    start: number;
    item: T;
  }>;
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollTo: (index: number) => void;
  isScrolling: boolean;
}

export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  containerHeight: initialContainerHeight,
}: VirtualListOptions<T>): VirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight || 400);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, start + visibleCount + overscan),
    };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        start: i * itemHeight,
        item: items[i],
      });
    }
    return result;
  }, [startIndex, endIndex, itemHeight, items]);

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
    
    // Track scrolling state
    setIsScrolling(true);
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    container.addEventListener('scroll', handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Scroll to index
  const scrollTo = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTop = index * itemHeight;
  }, [itemHeight]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollTo,
    isScrolling,
  };
}

/**
 * Virtual table hook with variable row heights
 */
export interface VirtualTableOptions<T> {
  items: T[];
  getItemHeight: (item: T, index: number) => number;
  overscan?: number;
}

export function useVirtualTable<T>({
  items,
  getItemHeight,
  overscan = 3,
}: VirtualTableOptions<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Calculate item positions
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let offset = 0;
    
    for (let i = 0; i < items.length; i++) {
      positions.push(offset);
      offset += getItemHeight(items[i], i);
    }
    
    return positions;
  }, [items, getItemHeight]);

  const totalHeight = itemPositions.length > 0
    ? itemPositions[itemPositions.length - 1] + getItemHeight(items[items.length - 1], items.length - 1)
    : 0;

  // Find visible range using binary search
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) return { startIndex: 0, endIndex: 0 };

    // Binary search for start index
    let low = 0;
    let high = itemPositions.length - 1;
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (itemPositions[mid] < scrollTop) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    
    const start = Math.max(0, low - overscan);
    
    // Find end index
    let end = low;
    while (end < items.length && itemPositions[end] < scrollTop + containerHeight) {
      end++;
    }
    
    return {
      startIndex: start,
      endIndex: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, containerHeight, itemPositions, items.length, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        start: itemPositions[i],
        height: getItemHeight(items[i], i),
        item: items[i],
      });
    }
    return result;
  }, [startIndex, endIndex, itemPositions, items, getItemHeight]);

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => setScrollTop(container.scrollTop);
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    container.addEventListener('scroll', handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollTo = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container || !itemPositions[index]) return;
    
    container.scrollTop = itemPositions[index];
  }, [itemPositions]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollTo,
  };
}

export default useVirtualList;


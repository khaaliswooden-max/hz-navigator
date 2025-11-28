/**
 * Virtual List Component
 * 
 * Renders only visible items for large lists.
 * Significantly improves performance for lists with 100+ items.
 */

import React, { memo, useMemo, forwardRef, type CSSProperties } from 'react';
import { useVirtualList } from '../../hooks/useVirtualList';

// ===== Types =====

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height?: number | string;
  width?: number | string;
  className?: string;
  overscan?: number;
  renderItem: (item: T, index: number, isScrolling: boolean) => React.ReactNode;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  isLoading?: boolean;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

// ===== Component =====

function VirtualListInner<T>(
  {
    items,
    itemHeight,
    height = 400,
    width = '100%',
    className = '',
    overscan = 5,
    renderItem,
    emptyState,
    loadingState,
    isLoading = false,
    onEndReached,
    endReachedThreshold = 100,
    getItemKey,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const {
    virtualItems,
    totalHeight,
    containerRef,
    isScrolling,
  } = useVirtualList({
    items,
    itemHeight,
    overscan,
  });

  // Handle end reached
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onEndReached) return;
    
    const target = e.target as HTMLDivElement;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    if (scrollBottom < endReachedThreshold) {
      onEndReached();
    }
  };

  // Merge refs
  const mergedRef = useMemo(() => {
    return (node: HTMLDivElement | null) => {
      // Update internal ref
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      
      // Update forwarded ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };
  }, [containerRef, ref]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, width }}
      >
        {emptyState || (
          <p className="text-gray-500 text-sm">No items to display</p>
        )}
      </div>
    );
  }

  // Container styles
  const containerStyle: CSSProperties = {
    height,
    width,
    overflow: 'auto',
    position: 'relative',
  };

  // Inner container styles (for total scrollable height)
  const innerStyle: CSSProperties = {
    height: totalHeight,
    width: '100%',
    position: 'relative',
  };

  return (
    <div
      ref={mergedRef}
      className={`virtual-list ${className}`}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={innerStyle}>
        {virtualItems.map(({ index, start, item }) => {
          const key = getItemKey ? getItemKey(item, index) : index;
          
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: itemHeight,
                transform: `translateY(${start}px)`,
              }}
            >
              {renderItem(item, index, isScrolling)}
            </div>
          );
        })}
      </div>
      
      {isLoading && loadingState && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80">
          {loadingState}
        </div>
      )}
    </div>
  );
}

// Create generic component with forwardRef
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

// ===== Memoized Row Component =====

interface VirtualRowProps {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const VirtualRow = memo<VirtualRowProps>(function VirtualRow({
  children,
  style,
  className = '',
}) {
  return (
    <div className={`virtual-row ${className}`} style={style}>
      {children}
    </div>
  );
});

// ===== Simple Virtual List for Basic Use Cases =====

interface SimpleVirtualListProps {
  items: React.ReactNode[];
  height?: number | string;
  itemHeight?: number;
  className?: string;
}

export const SimpleVirtualList = memo<SimpleVirtualListProps>(function SimpleVirtualList({
  items,
  height = 400,
  itemHeight = 48,
  className = '',
}) {
  return (
    <VirtualList
      items={items}
      itemHeight={itemHeight}
      height={height}
      className={className}
      renderItem={(item) => item}
    />
  );
});

export default VirtualList;


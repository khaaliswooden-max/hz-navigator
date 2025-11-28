import { useState, useMemo, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { useWindowSize } from '../../hooks/usePerformance';

// ============================================
// Types
// ============================================

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  /** Hide on mobile (shows in card view) */
  hideOnMobile?: boolean;
  /** Priority for card view (lower = more important) */
  priority?: number;
  /** Custom cell renderer */
  render?: (item: T, index: number) => ReactNode;
  /** Accessibility label for the column */
  ariaLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Unique key for each row */
  keyExtractor: (item: T) => string;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Selected row IDs */
  selectedIds?: Set<string>;
  /** Row selection handler */
  onSelect?: (id: string) => void;
  /** Select all handler */
  onSelectAll?: () => void;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Caption for accessibility */
  caption?: string;
  /** Enable card view on mobile */
  cardViewOnMobile?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hover effect on rows */
  hoverable?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Sort configuration */
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  /** Sort change handler */
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  /** Custom row class */
  rowClassName?: (item: T, index: number) => string;
}

// ============================================
// Responsive Table Component
// ============================================

/**
 * ResponsiveTable - Accessible, responsive data table
 * 
 * Features:
 * - Responsive card view on mobile
 * - Keyboard navigation
 * - Screen reader support
 * - Sortable columns
 * - Row selection
 * 
 * @example
 * <ResponsiveTable
 *   data={employees}
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'email', header: 'Email', hideOnMobile: true },
 *     { key: 'role', header: 'Role' },
 *   ]}
 *   keyExtractor={(item) => item.id}
 *   onRowClick={(item) => navigate(`/employees/${item.id}`)}
 * />
 */
export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data available',
  selectedIds,
  onSelect,
  onSelectAll,
  onRowClick,
  caption,
  cardViewOnMobile = true,
  striped = false,
  hoverable = true,
  compact = false,
  sortConfig,
  onSortChange,
  rowClassName,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useWindowSize();
  const showCardView = cardViewOnMobile && isMobile;

  // Sort columns by priority for card view
  const sortedColumns = useMemo(() => {
    if (!showCardView) return columns;
    return [...columns].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }, [columns, showCardView]);

  const visibleColumns = useMemo(() => {
    if (showCardView) return sortedColumns;
    return columns.filter((col) => !col.hideOnMobile || !isMobile);
  }, [columns, sortedColumns, isMobile, showCardView]);

  const handleSort = (key: string) => {
    if (!onSortChange) return;
    const newDirection =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(key, newDirection);
  };

  const getCellValue = (item: T, column: Column<T>): ReactNode => {
    if (column.render) {
      return column.render(item, data.indexOf(item));
    }
    const value = item[column.key as keyof T];
    return value as ReactNode;
  };

  // Card View for Mobile
  if (showCardView) {
    return (
      <div className="space-y-3" role="list" aria-label={caption}>
        {loading ? (
          <LoadingCards count={3} />
        ) : data.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          data.map((item, index) => {
            const id = keyExtractor(item);
            const isSelected = selectedIds?.has(id);

            return (
              <article
                key={id}
                role="listitem"
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick?.(item);
                  }
                }}
                className={clsx(
                  'bg-white rounded-xl border border-gray-200 p-4',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-hubzone-500 focus-visible:ring-offset-2',
                  onRowClick && 'cursor-pointer hover:border-hubzone-300 hover:shadow-md transition-all',
                  isSelected && 'border-hubzone-500 bg-hubzone-50',
                  rowClassName?.(item, index)
                )}
                aria-selected={isSelected}
              >
                <div className="flex items-start gap-3">
                  {onSelect && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelect(id);
                      }}
                      className="mt-1 w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
                      aria-label={`Select row ${index + 1}`}
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    {sortedColumns.map((column) => (
                      <div key={String(column.key)} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {column.header}:
                        </span>
                        <span className="text-sm text-gray-900">
                          {getCellValue(item, column)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    );
  }

  // Standard Table View
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table
          className="min-w-full divide-y divide-gray-200"
          aria-describedby={caption ? 'table-caption' : undefined}
        >
          {caption && (
            <caption id="table-caption" className="sr-only">
              {caption}
            </caption>
          )}
          <thead className="bg-gray-50">
            <tr>
              {onSelect && (
                <th scope="col" className="relative w-12 px-4 sm:px-6">
                  <input
                    type="checkbox"
                    checked={selectedIds?.size === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={clsx(
                    'text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    compact ? 'px-3 py-2' : 'px-4 py-3 sm:px-6',
                    column.sortable && 'cursor-pointer hover:text-gray-700 select-none'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(String(column.key));
                    }
                  }}
                  tabIndex={column.sortable ? 0 : undefined}
                  aria-sort={
                    sortConfig?.key === column.key
                      ? sortConfig.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  aria-label={column.ariaLabel}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <SortIcon
                        active={sortConfig?.key === column.key}
                        direction={sortConfig?.direction}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <LoadingRows columns={visibleColumns.length + (onSelect ? 1 : 0)} rows={5} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (onSelect ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds?.has(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick?.(item);
                      }
                    }}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={clsx(
                      'transition-colors',
                      'focus:outline-none focus-visible:bg-hubzone-50',
                      striped && index % 2 === 1 && 'bg-gray-50/50',
                      hoverable && 'hover:bg-gray-50',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-hubzone-50',
                      rowClassName?.(item, index)
                    )}
                    aria-selected={isSelected}
                  >
                    {onSelect && (
                      <td className="relative w-12 px-4 sm:px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            onSelect(id);
                          }}
                          className="w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={clsx(
                          'text-sm text-gray-900 whitespace-nowrap',
                          compact ? 'px-3 py-2' : 'px-4 py-4 sm:px-6'
                        )}
                      >
                        {getCellValue(item, column)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function SortIcon({ active, direction }: { active?: boolean; direction?: 'asc' | 'desc' }) {
  return (
    <svg
      className={clsx(
        'w-4 h-4 transition-colors',
        active ? 'text-hubzone-600' : 'text-gray-400'
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : direction === 'desc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      )}
    </svg>
  );
}

function LoadingRows({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-4 sm:px-6">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <svg
        className="w-12 h-12 mx-auto text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// ============================================
// Data Grid Component (for more complex grids)
// ============================================

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  /** Fixed header */
  stickyHeader?: boolean;
  /** Max height for scrollable area */
  maxHeight?: string;
  /** Row height for virtual scrolling */
  rowHeight?: number;
  /** Enable virtual scrolling for large datasets */
  virtualScroll?: boolean;
}

/**
 * DataGrid - Advanced data grid with virtual scrolling
 */
export function DataGrid<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  stickyHeader = true,
  maxHeight = '600px',
  rowHeight = 48,
  virtualScroll = false,
}: DataGridProps<T>) {
  // For now, just use ResponsiveTable
  // Virtual scrolling can be added with useVirtualScroll hook
  
  return (
    <div
      className={clsx(
        'border border-gray-200 rounded-xl overflow-hidden',
        stickyHeader && 'relative'
      )}
      style={{ maxHeight }}
    >
      <div className="overflow-auto h-full">
        <ResponsiveTable
          data={data}
          columns={columns}
          keyExtractor={keyExtractor}
          cardViewOnMobile={false}
          compact
        />
      </div>
    </div>
  );
}

export default ResponsiveTable;


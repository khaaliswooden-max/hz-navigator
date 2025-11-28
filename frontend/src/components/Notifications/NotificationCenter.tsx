import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { notificationService } from '../../services/notificationService';
import {
  LoadingSpinner,
  EmptyState,
  Button,
  ErrorMessage,
  SkeletonList,
} from '../Common';
import { useToast } from '../../context/ToastContext';
import type {
  Notification,
  NotificationCategory,
  NotificationPriority,
  NotificationFilters,
} from '../../types/notification';

/**
 * NotificationCenter - Full page notification management
 */
export default function NotificationCenter() {
  const { showSuccess, showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = reset ? 1 : page;
      const response = await notificationService.getNotifications({
        page: currentPage,
        limit: 20,
        unreadOnly: activeTab === 'unread',
        filters,
      });

      setNotifications(prev => 
        reset ? response.notifications : [...prev, ...response.notifications]
      );
      setUnreadCount(response.unreadCount);
      setHasMore(response.hasMore);
      
      if (reset) {
        setPage(1);
      }
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Failed to fetch notifications:', err);
      // Use mock data for demo
      setNotifications(getMockNotifications());
      setUnreadCount(3);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, filters]);

  useEffect(() => {
    fetchNotifications(true);
  }, [activeTab, filters]);

  // Mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read');
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // Mark selected as read
  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      await notificationService.markMultipleAsRead(Array.from(selectedIds));
      setNotifications(prev =>
        prev.map(n => (selectedIds.has(n.id) ? { ...n, read: true } : n))
      );
      setSelectedIds(new Set());
      showSuccess(`${selectedIds.size} notifications marked as read`);
    } catch (err) {
      setNotifications(prev =>
        prev.map(n => (selectedIds.has(n.id) ? { ...n, read: true } : n))
      );
      setSelectedIds(new Set());
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showSuccess('Notification deleted');
    } catch (err) {
      showError('Failed to delete notification');
    }
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      await notificationService.deleteMultiple(Array.from(selectedIds));
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      showSuccess(`${selectedIds.size} notifications deleted`);
    } catch (err) {
      showError('Failed to delete notifications');
    }
  };

  // Clear all read
  const handleClearRead = async () => {
    try {
      await notificationService.clearRead();
      setNotifications(prev => prev.filter(n => !n.read));
      showSuccess('Read notifications cleared');
    } catch (err) {
      showError('Failed to clear notifications');
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  // Load more
  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchNotifications(false);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRead}
            className="text-gray-500"
          >
            Clear read
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === 'unread'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-hubzone-100 text-hubzone-700 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filters.category?.[0] || ''}
            onChange={(e) =>
              setFilters(prev => ({
                ...prev,
                category: e.target.value
                  ? [e.target.value as NotificationCategory]
                  : undefined,
              }))
            }
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-hubzone-500 focus:border-hubzone-500"
          >
            <option value="">All Categories</option>
            <option value="compliance">Compliance</option>
            <option value="business">Business</option>
            <option value="certification">Certification</option>
            <option value="system">System</option>
            <option value="general">General</option>
          </select>

          <select
            value={filters.priority?.[0] || ''}
            onChange={(e) =>
              setFilters(prev => ({
                ...prev,
                priority: e.target.value
                  ? [e.target.value as NotificationPriority]
                  : undefined,
              }))
            }
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-hubzone-500 focus:border-hubzone-500"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-hubzone-50 border border-hubzone-200 rounded-xl p-4">
          <span className="text-sm text-hubzone-700 font-medium">
            {selectedIds.size} selected
          </span>
          <Button variant="ghost" size="sm" onClick={handleMarkSelectedAsRead}>
            Mark as read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSelected}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <ErrorMessage
          type="error"
          message={error}
          action={{ label: 'Retry', onClick: () => fetchNotifications(true) }}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-6">
            <SkeletonList items={5} />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            variant="no-alerts"
            title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
            description={
              activeTab === 'unread'
                ? "You've read all your notifications"
                : 'Notifications will appear here when there are updates'
            }
          />
        ) : (
          <>
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <input
                type="checkbox"
                checked={selectedIds.size === notifications.length && notifications.length > 0}
                onChange={selectAll}
                className="w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
              />
              <span className="text-sm text-gray-600">
                {selectedIds.size === notifications.length ? 'Deselect all' : 'Select all'}
              </span>
            </div>

            {/* Notification items */}
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  selected={selectedIds.has(notification.id)}
                  onToggleSelect={() => toggleSelection(notification.id)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onDelete={() => handleDelete(notification.id)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="p-4 text-center border-t border-gray-100">
                <Button
                  variant="ghost"
                  onClick={loadMore}
                  loading={loading}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings link */}
      <div className="text-center">
        <Link
          to="/settings"
          className="text-sm text-hubzone-600 hover:text-hubzone-700"
        >
          Manage notification preferences
        </Link>
      </div>
    </div>
  );
}

/**
 * Individual notification item
 */
function NotificationItem({
  notification,
  selected,
  onToggleSelect,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  selected: boolean;
  onToggleSelect: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}) {
  const priorityColors: Record<NotificationPriority, string> = {
    urgent: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-hubzone-500',
    low: 'bg-gray-400',
  };

  const categoryIcons: Record<NotificationCategory, React.ReactNode> = {
    compliance: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    business: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    certification: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    system: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    general: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const content = (
    <div className="flex items-start gap-4 flex-1">
      {/* Icon */}
      <div
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          notification.category === 'compliance' && 'bg-amber-100 text-amber-600',
          notification.category === 'business' && 'bg-hubzone-100 text-hubzone-600',
          notification.category === 'certification' && 'bg-verified-100 text-verified-600',
          notification.category === 'system' && 'bg-gray-100 text-gray-600',
          notification.category === 'general' && 'bg-hubzone-100 text-hubzone-600'
        )}
      >
        {categoryIcons[notification.category]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={clsx(
              'text-sm',
              notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'
            )}>
              {notification.title}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>
          
          {/* Priority indicator */}
          {notification.priority === 'urgent' || notification.priority === 'high' ? (
            <span
              className={clsx(
                'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
                priorityColors[notification.priority]
              )}
            />
          ) : null}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-gray-400">
            {getRelativeTime(notification.createdAt)}
          </span>
          <span className="text-xs text-gray-300">•</span>
          <span className="text-xs text-gray-400 capitalize">
            {notification.category}
          </span>
          {notification.actionUrl && (
            <>
              <span className="text-xs text-gray-300">•</span>
              <Link
                to={notification.actionUrl}
                className="text-xs text-hubzone-600 hover:text-hubzone-700"
              >
                {notification.actionLabel || 'View'}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={clsx(
        'flex items-start gap-4 px-4 py-4 hover:bg-gray-50 transition-colors',
        !notification.read && 'bg-hubzone-50/30',
        selected && 'bg-hubzone-50'
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        className="mt-3 w-4 h-4 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
      />

      {content}

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!notification.read && (
          <button
            onClick={onMarkAsRead}
            className="p-2 text-gray-400 hover:text-hubzone-600 hover:bg-hubzone-50 rounded-lg transition-colors"
            title="Mark as read"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="w-2 h-2 bg-hubzone-500 rounded-full flex-shrink-0 mt-4" />
      )}
    </div>
  );
}

/**
 * Mock notifications for demo
 */
function getMockNotifications(): Notification[] {
  return [
    {
      id: '1',
      userId: 'user-1',
      type: 'compliance_alert',
      category: 'compliance',
      priority: 'high',
      title: 'Employee Residency Alert',
      message: 'John Smith may no longer meet HUBZone residency requirements. Their address verification is pending.',
      read: false,
      dismissed: false,
      actionUrl: '/employees',
      actionLabel: 'Review Employee',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      userId: 'user-1',
      type: 'certificate_expiry',
      category: 'certification',
      priority: 'urgent',
      title: 'Certificate Expiring Soon',
      message: 'Your HUBZone certification will expire in 30 days. Start the renewal process now to avoid interruption.',
      read: false,
      dismissed: false,
      actionUrl: '/certifications',
      actionLabel: 'Start Renewal',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      userId: 'user-1',
      type: 'map_update',
      category: 'general',
      priority: 'medium',
      title: 'HUBZone Map Updated',
      message: 'The HUBZone qualification map has been updated. Check if your business locations are still in qualified areas.',
      read: false,
      dismissed: false,
      actionUrl: '/map',
      actionLabel: 'View Map',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '4',
      userId: 'user-1',
      type: 'application_update',
      category: 'business',
      priority: 'medium',
      title: 'Application Status Update',
      message: 'Your HUBZone certification application has moved to the review stage.',
      read: true,
      dismissed: false,
      actionUrl: '/certifications',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: '5',
      userId: 'user-1',
      type: 'system_announcement',
      category: 'system',
      priority: 'low',
      title: 'Scheduled Maintenance',
      message: 'The system will undergo scheduled maintenance on Saturday from 2:00 AM to 4:00 AM EST.',
      read: true,
      dismissed: false,
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ];
}


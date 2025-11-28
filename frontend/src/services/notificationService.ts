import { apiClient } from './api';
import type {
  Notification,
  NotificationsResponse,
  NotificationFilters,
  NotificationPreferences,
  NotificationStats,
} from '../types/notification';

const BASE_URL = '/notifications';

/**
 * Notification service for managing user notifications
 */
export const notificationService = {
  /**
   * Get paginated notifications for the current user
   */
  async getNotifications(
    params: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      filters?: NotificationFilters;
    } = {}
  ): Promise<NotificationsResponse> {
    const { page = 1, limit = 20, unreadOnly = false, filters } = params;
    
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (unreadOnly) {
      queryParams.append('unread', 'true');
    }

    if (filters?.type?.length) {
      filters.type.forEach((t) => queryParams.append('type', t));
    }

    if (filters?.category?.length) {
      filters.category.forEach((c) => queryParams.append('category', c));
    }

    if (filters?.priority?.length) {
      filters.priority.forEach((p) => queryParams.append('priority', p));
    }

    if (filters?.startDate) {
      queryParams.append('startDate', filters.startDate);
    }

    if (filters?.endDate) {
      queryParams.append('endDate', filters.endDate);
    }

    return apiClient.get<NotificationsResponse>(`${BASE_URL}?${queryParams}`);
  },

  /**
   * Get a single notification by ID
   */
  async getNotification(id: string): Promise<Notification> {
    return apiClient.get<Notification>(`${BASE_URL}/${id}`);
  },

  /**
   * Get notification statistics for the current user
   */
  async getStats(): Promise<NotificationStats> {
    return apiClient.get<NotificationStats>(`${BASE_URL}/stats`);
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>(`${BASE_URL}/unread-count`);
    return response.count;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return apiClient.patch<Notification>(`${BASE_URL}/${id}/read`);
  },

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<{ updated: number }> {
    return apiClient.post<{ updated: number }>(`${BASE_URL}/mark-read`, { ids });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ updated: number }> {
    return apiClient.post<{ updated: number }>(`${BASE_URL}/mark-all-read`);
  },

  /**
   * Dismiss a notification (soft delete)
   */
  async dismiss(id: string): Promise<void> {
    return apiClient.patch<void>(`${BASE_URL}/${id}/dismiss`);
  },

  /**
   * Delete a notification permanently
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${BASE_URL}/${id}`);
  },

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(ids: string[]): Promise<{ deleted: number }> {
    return apiClient.post<{ deleted: number }>(`${BASE_URL}/delete-multiple`, { ids });
  },

  /**
   * Clear all read notifications
   */
  async clearRead(): Promise<{ deleted: number }> {
    return apiClient.post<{ deleted: number }>(`${BASE_URL}/clear-read`);
  },

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return apiClient.get<NotificationPreferences>(`${BASE_URL}/preferences`);
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return apiClient.put<NotificationPreferences>(`${BASE_URL}/preferences`, preferences);
  },

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(subscription: PushSubscription): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/push/subscribe`, {
      subscription: subscription.toJSON(),
    });
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/push/unsubscribe`);
  },
};

/**
 * Hook-friendly notification polling
 */
export function createNotificationPoller(
  callback: (notifications: Notification[], unreadCount: number) => void,
  interval = 30000
) {
  let timerId: number | null = null;
  let isPolling = false;

  const poll = async () => {
    if (isPolling) return;
    
    isPolling = true;
    try {
      const response = await notificationService.getNotifications({ limit: 10 });
      callback(response.notifications, response.unreadCount);
    } catch (error) {
      console.error('Failed to poll notifications:', error);
    } finally {
      isPolling = false;
    }
  };

  return {
    start: () => {
      if (timerId) return;
      poll(); // Initial fetch
      timerId = window.setInterval(poll, interval);
    },
    stop: () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    },
    poll,
  };
}

export default notificationService;


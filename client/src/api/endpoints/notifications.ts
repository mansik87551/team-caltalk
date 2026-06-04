/** 알림 엔드포인트 (FE-02) */
import { apiClient } from '../client';
import type { Notification } from '../types';

export async function listNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('/api/notifications', {
    params: unreadOnly ? { unread: 'true' } : undefined,
  });
  return data;
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(
    `/api/notifications/${notificationId}/read`
  );
  return data;
}

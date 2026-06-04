/**
 * 실시간 소켓 연결 훅 (FE-10) — 로그인 시 연결, 이벤트→Query 무효화, 언마운트/로그아웃 시 정리.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { connectSocket, disconnectSocket, attachSocketHandlers } from '../api/socket';
import { SOCKET_NOTIFICATIONS } from '../features/notification/socketNotifications';

export function useSocket(): void {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    const detach = attachSocketHandlers(socket, queryClient);

    // 도메인 이벤트 → 화면 통지(FE-12).
    const notifyHandlers: Array<[string, () => void]> = [];
    for (const [event, notice] of Object.entries(SOCKET_NOTIFICATIONS)) {
      const handler = () => useNotificationStore.getState().add(notice.level, notice.message);
      socket.on(event, handler);
      notifyHandlers.push([event, handler]);
    }

    return () => {
      detach();
      for (const [event, handler] of notifyHandlers) socket.off(event, handler);
      disconnectSocket();
    };
  }, [token, queryClient]);
}

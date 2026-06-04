/**
 * 실시간 소켓 연결 훅 (FE-10) — 로그인 시 연결, 이벤트→Query 무효화, 언마운트/로그아웃 시 정리.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { connectSocket, disconnectSocket, attachSocketHandlers } from '../api/socket';

export function useSocket(): void {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    const detach = attachSocketHandlers(socket, queryClient);
    return () => {
      detach();
      disconnectSocket();
    };
  }, [token, queryClient]);
}

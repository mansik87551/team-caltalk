/**
 * WebSocket 클라이언트 (FE-10, NFR-03) — socket.io-client.
 *
 * - JWT 핸드셰이크로 연결(서버가 무효 토큰·비멤버 거부, BR-02). 서버가 소속 팀 룸에 자동 join.
 * - 수신 이벤트는 로컬 상태를 직접 만지지 않고 TanStack Query 무효화로 반영(단일 출처).
 * - 단일 인스턴스 룸 전제(Redis 미도입).
 */
import { io, type Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(baseURL, {
    auth: { token },
    transports: ['websocket'],
    // 끊김 시 자동 재연결(socket.io 기본). 재연결 시 핸드셰이크 재인증.
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** 최소 소켓 인터페이스(테스트 가능하도록 추상화). */
export interface SocketLike {
  on(event: string, cb: (payload?: unknown) => void): void;
  off(event: string, cb: (payload?: unknown) => void): void;
}

// 수신 채널(도메인:행위) → 무효화할 Query 키 prefix.
const EVENT_TO_QUERY_KEY: Record<string, string> = {
  'chat:message': 'chat',
  'schedule:created': 'schedules',
  'schedule:updated': 'schedules',
  'schedule:conflict': 'schedules',
  'request:created': 'changeRequests',
  'request:applied': 'changeRequests',
  'request:rejected': 'changeRequests',
  'notification:new': 'notifications',
};

/**
 * 소켓 수신 이벤트를 Query 무효화에 매핑 등록한다. 정리 함수를 반환한다.
 * request:applied/rejected 는 일정도 바뀌므로 schedules 도 함께 무효화한다.
 */
export function attachSocketHandlers(socket: SocketLike, queryClient: QueryClient): () => void {
  const entries = Object.entries(EVENT_TO_QUERY_KEY);
  const handlers: Array<[string, (payload?: unknown) => void]> = [];

  for (const [event, key] of entries) {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: [key] });
      // 변경요청 반영/반려는 대상 일정도 갱신.
      if (event === 'request:applied' || event === 'request:rejected') {
        queryClient.invalidateQueries({ queryKey: ['schedules'] });
      }
    };
    socket.on(event, handler);
    handlers.push([event, handler]);
  }

  return () => {
    for (const [event, handler] of handlers) socket.off(event, handler);
  };
}

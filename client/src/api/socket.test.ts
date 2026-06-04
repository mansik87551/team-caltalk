import { describe, it, expect, vi } from 'vitest';
import { attachSocketHandlers, type SocketLike } from './socket';
import type { QueryClient } from '@tanstack/react-query';

function fakeSocket() {
  const map = new Map<string, Array<(p?: unknown) => void>>();
  return {
    on(event: string, cb: (p?: unknown) => void) {
      const arr = map.get(event) ?? [];
      arr.push(cb);
      map.set(event, arr);
    },
    off(event: string, cb: (p?: unknown) => void) {
      map.set(event, (map.get(event) ?? []).filter((x) => x !== cb));
    },
    emit(event: string) {
      (map.get(event) ?? []).forEach((cb) => cb());
    },
  };
}

function mockQueryClient() {
  return { invalidateQueries: vi.fn() } as unknown as QueryClient;
}

describe('attachSocketHandlers (FE-10)', () => {
  it('chat:message → chat 쿼리 무효화(타 사용자 메시지 반영, NFR-03)', () => {
    const qc = mockQueryClient();
    const s = fakeSocket();
    attachSocketHandlers(s as unknown as SocketLike, qc);
    s.emit('chat:message');
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['chat'] });
  });

  it('schedule:updated → schedules 쿼리 무효화(캘린더 자동 갱신)', () => {
    const qc = mockQueryClient();
    const s = fakeSocket();
    attachSocketHandlers(s as unknown as SocketLike, qc);
    s.emit('schedule:updated');
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedules'] });
  });

  it('request:applied → changeRequests + schedules 둘 다 무효화', () => {
    const qc = mockQueryClient();
    const s = fakeSocket();
    attachSocketHandlers(s as unknown as SocketLike, qc);
    s.emit('request:applied');
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['changeRequests'] });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedules'] });
  });

  it('notification:new → notifications 무효화', () => {
    const qc = mockQueryClient();
    const s = fakeSocket();
    attachSocketHandlers(s as unknown as SocketLike, qc);
    s.emit('notification:new');
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('cleanup 후에는 이벤트가 무효화를 트리거하지 않는다', () => {
    const qc = mockQueryClient();
    const s = fakeSocket();
    const detach = attachSocketHandlers(s as unknown as SocketLike, qc);
    detach();
    s.emit('chat:message');
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });
});

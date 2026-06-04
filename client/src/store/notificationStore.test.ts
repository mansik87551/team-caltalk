import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

beforeEach(() => useNotificationStore.getState().clear());

describe('notificationStore (FE-12 / OI-5)', () => {
  it('동일 메시지는 중복 없이 누적된다', () => {
    const { add } = useNotificationStore.getState();
    add('warning', '충돌');
    add('warning', '충돌');
    add('info', '요청 도착');
    expect(useNotificationStore.getState().notices).toHaveLength(2);
  });

  it('dismiss 로 개별 해제, clear 로 전체 해제', () => {
    const { add } = useNotificationStore.getState();
    add('info', 'A');
    add('info', 'B');
    const first = useNotificationStore.getState().notices[0];
    useNotificationStore.getState().dismiss(first.id);
    expect(useNotificationStore.getState().notices.map((n) => n.message)).toEqual(['B']);
    useNotificationStore.getState().clear();
    expect(useNotificationStore.getState().notices).toHaveLength(0);
  });
});

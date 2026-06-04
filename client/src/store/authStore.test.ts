import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User } from '../api/types';

const user: User = {
  id: 'u1',
  email: 'hong@example.com',
  displayName: '홍길동',
  createdAt: '2026-06-02T09:00:00Z',
  updatedAt: '2026-06-02T09:00:00Z',
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().clearAuth();
});

describe('authStore (FE-03)', () => {
  it('setAuth 시 token·user 저장 + isAuthenticated true + localStorage 영속', () => {
    useAuthStore.getState().setAuth('tok-1', user);
    const s = useAuthStore.getState();
    expect(s.token).toBe('tok-1');
    expect(s.user?.email).toBe('hong@example.com');
    expect(s.isAuthenticated).toBe(true);
    expect(localStorage.getItem('tc_access_token')).toBe('tok-1');
    expect(JSON.parse(localStorage.getItem('tc_user') as string).id).toBe('u1');
  });

  it('clearAuth 시 전체 폐기 + localStorage 비움', () => {
    useAuthStore.getState().setAuth('tok-1', user);
    useAuthStore.getState().clearAuth();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(localStorage.getItem('tc_access_token')).toBeNull();
    expect(localStorage.getItem('tc_user')).toBeNull();
  });
});

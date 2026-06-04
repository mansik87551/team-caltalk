import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../api/types';

const authResponse: AuthResponse = {
  token: 'tok-xyz',
  user: {
    id: 'u1',
    email: 'a@b.com',
    displayName: '테스터',
    createdAt: '2026-06-02T09:00:00Z',
    updatedAt: '2026-06-02T09:00:00Z',
  },
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().clearAuth();
  useUiStore.getState().reset();
});

describe('useAuth (FE-03)', () => {
  it('login 시 인증 상태가 되고 user 가 노출된다', () => {
    const { result } = renderHook(() => useAuth());
    act(() => result.current.login(authResponse));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('a@b.com');
  });

  it('logout 시 인증 + UI 컨텍스트(팀)까지 전체 초기화된다', () => {
    useUiStore.getState().setCurrentTeam('team-1', 'team_leader');
    const { result } = renderHook(() => useAuth());
    act(() => result.current.login(authResponse));
    act(() => result.current.logout());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(useUiStore.getState().currentTeamId).toBeNull();
  });
});

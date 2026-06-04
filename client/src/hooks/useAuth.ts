/**
 * 인증 상태/액션 구독 훅 (FE-03)
 *
 * - login(authResponse): 토큰·사용자 저장.
 * - logout(): 인증 + UI 컨텍스트(팀/선택일) 전체 초기화.
 */
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import type { AuthResponse } from '../api/types';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetUi = useUiStore((s) => s.reset);

  const login = (res: AuthResponse): void => setAuth(res.token, res.user);
  const logout = (): void => {
    clearAuth();
    resetUi();
  };

  return { token, user, isAuthenticated, login, logout };
}

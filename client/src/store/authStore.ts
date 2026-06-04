/**
 * 인증 스토어 (FE-03, UC-01)
 *
 * - token(액세스 단독, OI-4)·user 를 보관하고 localStorage 로 영속/복원한다.
 * - 토큰은 lib/token(인터셉터 공유)에, user 는 별도 키에 저장한다.
 * - role(권한) 은 팀별 멤버십이므로 uiStore(currentRole)에서 관리한다.
 */
import { create } from 'zustand';
import { getToken, setToken, clearToken } from '../lib/token';
import type { User } from '../api/types';

const USER_KEY = 'tc_user';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function saveUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 새로고침 시 localStorage 에서 복원.
  token: getToken(),
  user: loadUser(),
  isAuthenticated: Boolean(getToken()),
  setAuth: (token, user) => {
    setToken(token);
    saveUser(user);
    set({ token, user, isAuthenticated: true });
  },
  clearAuth: () => {
    clearToken();
    saveUser(null);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

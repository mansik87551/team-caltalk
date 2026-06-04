/**
 * 액세스 토큰 저장소 (FE-02)
 *
 * - JWT 액세스 토큰 단독(OI-4)을 localStorage 에 보관한다.
 * - axios 인터셉터(동기 접근)와 인증 스토어(FE-03)가 공유하는 단일 진입점.
 */

const TOKEN_KEY = 'tc_access_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage 불가 환경 무시 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

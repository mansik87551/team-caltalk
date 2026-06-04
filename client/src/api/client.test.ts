import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/setup';
import { apiClient, ApiError } from './client';
import { setToken, getToken } from '../lib/token';

const BASE = 'http://localhost:3000';

describe('apiClient (FE-02)', () => {
  it('요청에 JWT 를 Authorization 헤더로 자동 첨부한다', async () => {
    setToken('test-token-123');
    let received: string | null = null;
    server.use(
      http.get(`${BASE}/api/ping`, ({ request }) => {
        received = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      })
    );
    await apiClient.get('/api/ping');
    expect(received).toBe('Bearer test-token-123');
  });

  it('토큰이 없으면 Authorization 헤더를 붙이지 않는다', async () => {
    let hasAuth = true;
    server.use(
      http.get(`${BASE}/api/ping`, ({ request }) => {
        hasAuth = request.headers.has('authorization');
        return HttpResponse.json({ ok: true });
      })
    );
    await apiClient.get('/api/ping');
    expect(hasAuth).toBe(false);
  });

  it('서버 표준 에러 { error: { code, message } } 를 ApiError 로 정규화한다', async () => {
    server.use(
      http.post(`${BASE}/api/x`, () =>
        HttpResponse.json({ error: { code: 'CONFLICT', message: '충돌' } }, { status: 409 })
      )
    );
    await expect(apiClient.post('/api/x')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('401 수신 시 토큰 폐기 후 /login 으로 이동한다', async () => {
    setToken('will-be-cleared');
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', assign },
      writable: true,
      configurable: true,
    });
    server.use(
      http.get(`${BASE}/api/secure`, () =>
        HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증 필요' } }, { status: 401 })
      )
    );
    await expect(apiClient.get('/api/secure')).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('네트워크/비표준 에러는 NETWORK_ERROR 로 정규화한다', async () => {
    server.use(http.get(`${BASE}/api/down`, () => HttpResponse.error()));
    await expect(apiClient.get('/api/down')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

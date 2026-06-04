import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// 로그인 후 진입하는 워크스페이스의 실시간 소켓은 테스트에서 실제 연결하지 않는다.
vi.mock('../../hooks/useSocket', () => ({ useSocket: () => {} }));
import { server } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import App from '../../App';
import { useAuthStore } from '../../store/authStore';

const BASE = 'http://localhost:3000';
const user = {
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

describe('인증 화면 (FE-04 / UC-01 / SC-01)', () => {
  it('로그인/회원가입 탭과 로그인 폼을 렌더한다', () => {
    renderWithProviders(<App />, '/login');
    expect(screen.getByRole('tab', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '회원가입' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('빈 입력 제출 시 zod 검증 에러를 표시하고 요청하지 않는다', async () => {
    const u = userEvent.setup();
    renderWithProviders(<App />, '/login');
    await u.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('이메일을 입력하세요')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력하세요')).toBeInTheDocument();
  });

  it('로그인 성공 시 토큰 저장 + 워크스페이스로 진입한다 (SC-01)', async () => {
    server.use(
      http.post(`${BASE}/api/auth/login`, () =>
        HttpResponse.json({ token: 'tok-1', user }, { status: 200 })
      ),
      http.get(`${BASE}/api/teams`, () => HttpResponse.json([]))
    );
    const u = userEvent.setup();
    renderWithProviders(<App />, '/login');
    await u.type(screen.getByLabelText('이메일'), 'hong@example.com');
    await u.type(screen.getByLabelText('비밀번호'), 'P@ssw0rd!');
    await u.click(screen.getByRole('button', { name: '로그인' }));

    // 워크스페이스 진입 신호: 헤더에 사용자명 노출.
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('tok-1');
  });

  it('로그인 실패(401) 시 서버 에러 메시지를 표시한다', async () => {
    server.use(
      http.post(`${BASE}/api/auth/login`, () =>
        HttpResponse.json(
          { error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' } },
          { status: 401 }
        )
      )
    );
    const u = userEvent.setup();
    renderWithProviders(<App />, '/login');
    await u.type(screen.getByLabelText('이메일'), 'hong@example.com');
    await u.type(screen.getByLabelText('비밀번호'), 'wrong');
    await u.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('올바르지 않습니다');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('회원가입 성공 시 자동 로그인되어 진입한다', async () => {
    server.use(
      http.post(`${BASE}/api/auth/signup`, () =>
        HttpResponse.json({ token: 'tok-2', user }, { status: 201 })
      ),
      http.get(`${BASE}/api/teams`, () => HttpResponse.json([]))
    );
    const u = userEvent.setup();
    renderWithProviders(<App />, '/login');
    await u.click(screen.getByRole('tab', { name: '회원가입' }));
    await u.type(screen.getByLabelText('이메일'), 'hong@example.com');
    await u.type(screen.getByLabelText('이름'), '홍길동');
    await u.type(screen.getByLabelText('비밀번호'), 'P@ssw0rd!');
    await u.click(screen.getByRole('button', { name: '회원가입' }));

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe('tok-2');
  });

  it('미인증 상태로 보호 라우트(/) 접근 시 로그인 화면으로 차단된다 (BR-01/AC-06)', () => {
    renderWithProviders(<App />, '/');
    expect(screen.getByRole('tab', { name: '로그인' })).toBeInTheDocument();
  });
});

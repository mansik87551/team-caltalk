import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// 실시간 소켓은 단위 테스트에서 실제 연결하지 않는다(매핑은 socket.test.ts 에서 검증).
vi.mock('../hooks/useSocket', () => ({ useSocket: () => {} }));
import { server } from '../test/setup';
import { renderWithProviders } from '../test/utils';
import TeamWorkspacePage from './TeamWorkspacePage';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const BASE = 'http://localhost:3000';
const user = {
  id: 'u1',
  email: 'hong@example.com',
  displayName: '홍길동',
  createdAt: '2026-06-02T09:00:00Z',
  updatedAt: '2026-06-02T09:00:00Z',
};
const teams = [
  { id: 't1', name: '백엔드팀', role: 'team_leader', createdAt: 'x', updatedAt: 'x' },
  { id: 't2', name: '프론트팀', role: 'team_member', createdAt: 'x', updatedAt: 'x' },
];

beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().clearAuth();
  useUiStore.getState().reset();
  useAuthStore.getState().setAuth('tok', user);
  server.use(http.get(`${BASE}/api/teams`, () => HttpResponse.json(teams)));
});

describe('TeamWorkspacePage (FE-06 / UC-06)', () => {
  it('헤더에 사용자명·역할·로그아웃과 캘린더/채팅 슬롯을 표시한다', async () => {
    renderWithProviders(<TeamWorkspacePage />, '/');
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    // 첫 팀 자동 선택(팀장)
    expect(await screen.findByText('팀장')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
    expect(screen.getByLabelText('캘린더 영역')).toBeInTheDocument();
    expect(screen.getByLabelText('채팅 영역')).toBeInTheDocument();
  });

  it('팀 전환 시 currentTeamId·역할이 갱신된다', async () => {
    const u = userEvent.setup();
    renderWithProviders(<TeamWorkspacePage />, '/');
    await screen.findByText('팀장');
    await u.selectOptions(screen.getByLabelText('팀 선택'), 't2');
    await waitFor(() => expect(useUiStore.getState().currentTeamId).toBe('t2'));
    expect(screen.getByText('팀원')).toBeInTheDocument();
  });

  it('새 팀 생성 시 해당 팀으로 전환된다', async () => {
    server.use(
      http.post(`${BASE}/api/teams`, () =>
        HttpResponse.json(
          { id: 't3', name: '신규팀', role: 'team_leader', createdAt: 'x', updatedAt: 'x' },
          { status: 201 }
        )
      )
    );
    const u = userEvent.setup();
    renderWithProviders(<TeamWorkspacePage />, '/');
    await screen.findByText('팀장');
    await u.type(screen.getByLabelText('새 팀 이름'), '신규팀');
    await u.click(screen.getByRole('button', { name: '팀 생성' }));
    await waitFor(() => expect(useUiStore.getState().currentTeamId).toBe('t3'));
  });
});

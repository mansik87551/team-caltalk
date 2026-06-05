import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { TeamSwitcher } from './TeamSwitcher';
import { useUiStore } from '../../store/uiStore';
import type { TeamWithRole } from '../../api/types';

const BASE = 'http://localhost:3000';
const teams: TeamWithRole[] = [
  { id: 't1', name: '백엔드팀', role: 'team_leader', createdAt: 'x', updatedAt: 'x' },
];

beforeEach(() => {
  useUiStore.getState().reset();
  useUiStore.getState().setCurrentTeam('t1', 'team_leader');
});

describe('TeamSwitcher 팀 참여 (BR-02 같은 팀이어야 채팅 공유)', () => {
  it('팀 ID로 참여 시 해당 팀으로 전환된다', async () => {
    let joinedTeamId: string | null = null;
    server.use(
      http.post(`${BASE}/api/teams/:teamId/members`, ({ params }) => {
        joinedTeamId = params.teamId as string;
        return HttpResponse.json(
          { id: 'm1', userId: 'u2', teamId: params.teamId, role: 'team_member', joinedAt: 'x' },
          { status: 201 }
        );
      }),
      http.get(`${BASE}/api/teams`, () => HttpResponse.json(teams))
    );
    const u = userEvent.setup();
    renderWithProviders(<TeamSwitcher teams={teams} />, '/');
    await u.type(screen.getByLabelText('참여할 팀 ID'), 'team-xyz');
    await u.click(screen.getByRole('button', { name: '참여' }));
    await waitFor(() => expect(joinedTeamId).toBe('team-xyz'));
    await waitFor(() => expect(useUiStore.getState().currentTeamId).toBe('team-xyz'));
  });

  it('참여 실패(404) 시 에러 안내를 표시한다', async () => {
    server.use(
      http.post(`${BASE}/api/teams/:teamId/members`, () =>
        HttpResponse.json({ error: { code: 'TEAM_NOT_FOUND', message: '존재하지 않는 팀' } }, { status: 404 })
      )
    );
    const u = userEvent.setup();
    renderWithProviders(<TeamSwitcher teams={teams} />, '/');
    await u.type(screen.getByLabelText('참여할 팀 ID'), 'nope');
    await u.click(screen.getByRole('button', { name: '참여' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('참여 실패');
  });

  it('현재 팀 ID 복사 버튼을 제공한다(팀 공유용)', () => {
    renderWithProviders(<TeamSwitcher teams={teams} />, '/');
    expect(screen.getByRole('button', { name: '팀 ID 복사' })).toBeInTheDocument();
  });
});

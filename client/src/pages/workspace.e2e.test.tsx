import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../test/setup';
import { renderWithProviders } from '../test/utils';
import App from '../App';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useNotificationStore } from '../store/notificationStore';
import type { ChatMessage } from '../api/types';

// 실시간 소켓은 E2E 에서 실제 연결하지 않는다.
vi.mock('../hooks/useSocket', () => ({ useSocket: () => {} }));

const BASE = 'http://localhost:3000';
const user = {
  id: 'u1',
  email: 'hong@example.com',
  displayName: '홍길동',
  createdAt: 'x',
  updatedAt: 'x',
};

function scheduleResp(conflicts: unknown[] = []) {
  return {
    schedule: {
      id: 's1',
      teamId: 't1',
      title: '스프린트 회의',
      startAt: '2026-06-05T05:00:00Z',
      endAt: '2026-06-05T06:00:00Z',
      isAllDay: false,
      createdBy: 'u1',
      createdAt: 'x',
      updatedAt: 'x',
    },
    conflicts,
  };
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().clearAuth();
  useUiStore.getState().reset();
  useNotificationStore.getState().clear();
  useAuthStore.getState().setAuth('tok', user);
  useUiStore.getState().setSelectedDate('2026-06-05');

  const chat: ChatMessage[] = [];
  server.use(
    http.get(`${BASE}/api/teams`, () =>
      HttpResponse.json([{ id: 't1', name: '백엔드팀', role: 'team_leader', createdAt: 'x', updatedAt: 'x' }])
    ),
    http.get(`${BASE}/api/teams/t1/schedules`, () => HttpResponse.json([])),
    http.post(`${BASE}/api/teams/t1/schedules`, () => HttpResponse.json(scheduleResp([]), { status: 201 })),
    http.get(`${BASE}/api/teams/t1/schedule-change-requests`, () => HttpResponse.json([])),
    http.get(`${BASE}/api/teams/t1/chat`, ({ request }) => {
      const date = new URL(request.url).searchParams.get('date');
      return HttpResponse.json(chat.filter((m) => m.targetDate === date));
    }),
    http.post(`${BASE}/api/teams/t1/chat`, async ({ request }) => {
      const body = (await request.json()) as { content: string; targetDate?: string };
      const msg: ChatMessage = {
        id: `m${chat.length + 1}`,
        teamId: 't1',
        senderId: 'u1',
        content: body.content,
        targetDate: body.targetDate ?? '2026-06-05',
        createdAt: '2026-06-05T05:00:00Z',
      };
      chat.push(msg);
      return HttpResponse.json(msg, { status: 201 });
    })
  );
});

describe('워크스페이스 해피패스 E2E (FE-14 / SC-01~04)', () => {
  it('진입 → 팀장 일정 등록 → 채팅 전송이 통합 동작한다', async () => {
    const u = userEvent.setup();
    renderWithProviders(<App />, '/');

    // SC-01: 워크스페이스 진입(헤더 사용자명·역할)
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(await screen.findByText('팀장')).toBeInTheDocument();

    // SC-02: 일정 등록(팀장만 노출되는 RoleGate 버튼)
    await u.click(await screen.findByRole('button', { name: '일정 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '일정 등록' });
    await u.type(within(dialog).getByLabelText('제목'), '스프린트 회의');
    await u.type(within(dialog).getByLabelText('시작 일시'), '2026-06-05T14:00');
    await u.type(within(dialog).getByLabelText('종료 일시'), '2026-06-05T15:00');
    await u.click(within(dialog).getByRole('button', { name: '등록' }));

    // 저장 성공(충돌 없음) → 모달 닫힘
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument()
    );

    // SC-04: 채팅 전송 → 목록 반영
    await u.type(screen.getByLabelText('메시지 입력'), '회의 잘 부탁드립니다');
    await u.click(screen.getByRole('button', { name: '전송' }));
    expect(await screen.findByText('회의 잘 부탁드립니다')).toBeInTheDocument();
  });

  it('겹치는 일정 등록 시 충돌 경고 토스트가 뜬다(SC-03/BR-08)', async () => {
    server.use(
      http.post(`${BASE}/api/teams/t1/schedules`, () =>
        HttpResponse.json(
          scheduleResp([
            { scheduleId: 'x', title: '겹친 회의', startAt: '2026-06-05T05:30:00Z', endAt: '2026-06-05T06:30:00Z' },
          ]),
          { status: 201 }
        )
      )
    );
    const u = userEvent.setup();
    renderWithProviders(<App />, '/');
    await screen.findByText('홍길동');
    await u.click(await screen.findByRole('button', { name: '일정 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '일정 등록' });
    await u.type(within(dialog).getByLabelText('제목'), '겹치는 회의');
    await u.type(within(dialog).getByLabelText('시작 일시'), '2026-06-05T14:30');
    await u.type(within(dialog).getByLabelText('종료 일시'), '2026-06-05T15:30');
    await u.click(within(dialog).getByRole('button', { name: '등록' }));

    // 충돌 경고(모달 인라인 + 토스트), 저장은 유지(BR-08)
    expect(await screen.findByText(/충돌하는 일정이 있습니다/)).toBeInTheDocument();
    await waitFor(() =>
      expect(useNotificationStore.getState().notices.some((n) => n.level === 'warning')).toBe(true)
    );
  });
});

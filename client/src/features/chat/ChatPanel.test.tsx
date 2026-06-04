import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { ChatPanel } from './ChatPanel';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

const BASE = 'http://localhost:3000';

function msg(id: string, content: string, targetDate: string, senderId = 'u1') {
  return {
    id,
    teamId: 't1',
    senderId,
    content,
    targetDate,
    createdAt: '2026-06-05T05:00:00Z',
  };
}

beforeEach(() => {
  useUiStore.getState().reset();
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuth('tok', {
    id: 'u1',
    email: 'a@b.com',
    displayName: '나',
    createdAt: 'x',
    updatedAt: 'x',
  });
});

describe('ChatPanel (FE-09 / SC-04 / BR-05)', () => {
  it('selectedDate 의 Daily Chat Log 를 조회·표시하고 createdAt 을 KST 로 보여준다', async () => {
    useUiStore.getState().setSelectedDate('2026-06-05');
    server.use(
      http.get(`${BASE}/api/teams/t1/chat`, ({ request }) => {
        const date = new URL(request.url).searchParams.get('date');
        return HttpResponse.json(date === '2026-06-05' ? [msg('m1', '안녕하세요', '2026-06-05')] : []);
      })
    );
    renderWithProviders(<ChatPanel teamId="t1" />, '/');
    expect(await screen.findByText('안녕하세요')).toBeInTheDocument();
    expect(screen.getByText('대상 날짜: 2026-06-05')).toBeInTheDocument();
    // 05:00Z → KST 14:00
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('전송 시 selectedDate 가 targetDate 로 부여된다(도메인 4.1)', async () => {
    useUiStore.getState().setSelectedDate('2026-06-07');
    let postedTargetDate: string | null = null;
    server.use(
      http.get(`${BASE}/api/teams/t1/chat`, () => HttpResponse.json([])),
      http.post(`${BASE}/api/teams/t1/chat`, async ({ request }) => {
        const body = (await request.json()) as { content: string; targetDate?: string };
        postedTargetDate = body.targetDate ?? null;
        return HttpResponse.json(msg('m2', body.content, body.targetDate ?? '2026-06-07'), {
          status: 201,
        });
      })
    );
    const u = userEvent.setup();
    renderWithProviders(<ChatPanel teamId="t1" />, '/');
    await u.type(screen.getByLabelText('메시지 입력'), '오늘 회의 어때요');
    await u.click(screen.getByRole('button', { name: '전송' }));
    await waitFor(() => expect(postedTargetDate).toBe('2026-06-07'));
  });

  it('selectedDate 변경 시 해당 날짜 대화로 동기화된다(SC-04)', async () => {
    server.use(
      http.get(`${BASE}/api/teams/t1/chat`, ({ request }) => {
        const date = new URL(request.url).searchParams.get('date');
        if (date === '2026-06-05') return HttpResponse.json([msg('a', '5일 대화', '2026-06-05')]);
        if (date === '2026-06-08') return HttpResponse.json([msg('b', '8일 대화', '2026-06-08')]);
        return HttpResponse.json([]);
      })
    );
    useUiStore.getState().setSelectedDate('2026-06-05');
    renderWithProviders(<ChatPanel teamId="t1" />, '/');
    expect(await screen.findByText('5일 대화')).toBeInTheDocument();

    useUiStore.getState().setSelectedDate('2026-06-08');
    expect(await screen.findByText('8일 대화')).toBeInTheDocument();
    expect(screen.queryByText('5일 대화')).not.toBeInTheDocument();
  });
});

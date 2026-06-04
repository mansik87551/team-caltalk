import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { ScheduleModal } from './ScheduleModal';
import type { Schedule } from '../../api/types';

const BASE = 'http://localhost:3000';

function scheduleResponse(conflicts: unknown[] = []) {
  return {
    schedule: {
      id: 's1',
      teamId: 't1',
      title: '회의',
      startAt: '2026-06-05T05:00:00Z',
      endAt: '2026-06-05T06:00:00Z',
      isAllDay: false,
      createdBy: 'u1',
      createdAt: 'x',
      updatedAt: 'x',
    } as Schedule,
    conflicts,
  };
}

describe('ScheduleModal (FE-08 / BR-06/07/08)', () => {
  it('start==end 클라이언트 검증 거부(요청 안 함)', async () => {
    const u = userEvent.setup();
    renderWithProviders(<ScheduleModal teamId="t1" onClose={() => {}} />, '/');
    await u.type(screen.getByLabelText('제목'), '회의');
    await u.type(screen.getByLabelText('시작 일시'), '2026-06-05T14:00');
    await u.type(screen.getByLabelText('종료 일시'), '2026-06-05T14:00');
    await u.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('종료 일시는 시작 일시보다 이후여야 합니다')).toBeInTheDocument();
  });

  it('충돌 없으면 저장 후 onClose 호출(SC-02)', async () => {
    server.use(
      http.post(`${BASE}/api/teams/t1/schedules`, () =>
        HttpResponse.json(scheduleResponse([]), { status: 201 })
      )
    );
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithProviders(<ScheduleModal teamId="t1" onClose={onClose} />, '/');
    await u.type(screen.getByLabelText('제목'), '회의');
    await u.type(screen.getByLabelText('시작 일시'), '2026-06-05T14:00');
    await u.type(screen.getByLabelText('종료 일시'), '2026-06-05T15:00');
    await u.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('서버 충돌 반환 시 저장 유지 + 경고 표시(BR-08/SC-03)', async () => {
    server.use(
      http.post(`${BASE}/api/teams/t1/schedules`, () =>
        HttpResponse.json(
          scheduleResponse([
            { scheduleId: 'x', title: '겹친 회의', startAt: '2026-06-05T05:30:00Z', endAt: '2026-06-05T06:30:00Z' },
          ]),
          { status: 201 }
        )
      )
    );
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithProviders(<ScheduleModal teamId="t1" onClose={onClose} />, '/');
    await u.type(screen.getByLabelText('제목'), '회의');
    await u.type(screen.getByLabelText('시작 일시'), '2026-06-05T14:00');
    await u.type(screen.getByLabelText('종료 일시'), '2026-06-05T15:00');
    await u.click(screen.getByRole('button', { name: '등록' }));

    expect(await screen.findByText(/충돌하는 일정이 있습니다/)).toBeInTheDocument();
    expect(screen.getByText(/겹친 회의/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled(); // 경고 확인 전까지 유지
  });
});

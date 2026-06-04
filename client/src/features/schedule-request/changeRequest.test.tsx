import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { CreateChangeRequest } from './CreateChangeRequest';
import { RequestProcessPanel } from './RequestProcessPanel';
import type { Schedule, ScheduleChangeRequest } from '../../api/types';

const BASE = 'http://localhost:3000';
const schedule: Schedule = {
  id: 's1',
  teamId: 't1',
  title: '원본 회의',
  startAt: '2026-06-05T05:00:00Z',
  endAt: '2026-06-05T06:00:00Z',
  isAllDay: false,
  createdBy: 'u1',
  createdAt: 'x',
  updatedAt: 'x',
};

function scr(over: Partial<ScheduleChangeRequest> = {}): ScheduleChangeRequest {
  return {
    id: 'r1',
    teamId: 't1',
    scheduleId: 's1',
    requesterId: 'u2',
    status: 'requested',
    requestContent: '한 시간 미뤄주세요',
    originMessageId: 'm1',
    processedBy: null,
    processedAt: null,
    rejectReason: null,
    createdAt: 'x',
    ...over,
  };
}

beforeEach(() => {
  /* MSW reset in setup */
});

describe('CreateChangeRequest (FE-11 / SC-05)', () => {
  it('팀원 요청 생성 시 content 로 메시지 생성+연결(originMessageId) 후 닫힌다', async () => {
    const cap: { value?: { scheduleId: string; content: string } } = {};
    server.use(
      http.post(`${BASE}/api/teams/t1/schedule-change-requests`, async ({ request }) => {
        cap.value = (await request.json()) as { scheduleId: string; content: string };
        return HttpResponse.json(scr(), { status: 201 });
      })
    );
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithProviders(<CreateChangeRequest teamId="t1" schedule={schedule} onClose={onClose} />, '/');
    await u.type(screen.getByLabelText('요청 내용'), '한 시간 미뤄주세요');
    await u.click(screen.getByRole('button', { name: '요청 보내기' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(cap.value?.scheduleId).toBe('s1');
    expect(cap.value?.content).toBe('한 시간 미뤄주세요');
  });
});

describe('RequestProcessPanel (FE-11 / BR-09 / AC-08)', () => {
  it('팀원에게는 처리 버튼이 노출되지 않는다(BR-04)', async () => {
    server.use(
      http.get(`${BASE}/api/teams/t1/schedule-change-requests`, () => HttpResponse.json([scr()]))
    );
    renderWithProviders(<RequestProcessPanel teamId="t1" isLeader={false} />, '/');
    expect(await screen.findByText('한 시간 미뤄주세요')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '반영' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '반려' })).not.toBeInTheDocument();
  });

  it('팀장이 반려 처리 시 PATCH(action=rejected)를 호출한다', async () => {
    const cap: { value?: { action: string; rejectReason?: string } } = {};
    server.use(
      http.get(`${BASE}/api/teams/t1/schedule-change-requests`, () => HttpResponse.json([scr()])),
      http.patch(`${BASE}/api/teams/t1/schedule-change-requests/r1`, async ({ request }) => {
        cap.value = (await request.json()) as { action: string; rejectReason?: string };
        return HttpResponse.json(scr({ status: 'rejected', rejectReason: '불가' }));
      })
    );
    const u = userEvent.setup();
    renderWithProviders(<RequestProcessPanel teamId="t1" isLeader />, '/');
    await screen.findByText('한 시간 미뤄주세요');
    await u.type(screen.getByLabelText('반려 사유'), '불가');
    await u.click(screen.getByRole('button', { name: '반려' }));
    await waitFor(() => expect(cap.value?.action).toBe('rejected'));
    expect(cap.value?.rejectReason).toBe('불가');
  });

  it('종결(applied) 요청은 처리 버튼이 비활성(미노출)이고 상태를 표시한다(AC-08)', async () => {
    server.use(
      http.get(`${BASE}/api/teams/t1/schedule-change-requests`, () =>
        HttpResponse.json([scr({ status: 'applied', processedBy: 'u1' })])
      )
    );
    renderWithProviders(<RequestProcessPanel teamId="t1" isLeader />, '/');
    expect(await screen.findByText('반영됨')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '반영' })).not.toBeInTheDocument();
  });

  it('반려된 요청은 사유를 표시한다(SC-06)', async () => {
    server.use(
      http.get(`${BASE}/api/teams/t1/schedule-change-requests`, () =>
        HttpResponse.json([scr({ status: 'rejected', rejectReason: '일정 변경 불가' })])
      )
    );
    renderWithProviders(<RequestProcessPanel teamId="t1" isLeader />, '/');
    expect(await screen.findByText(/반려 사유: 일정 변경 불가/)).toBeInTheDocument();
  });
});

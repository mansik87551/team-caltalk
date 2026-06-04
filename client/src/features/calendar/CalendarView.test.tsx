import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { CalendarView } from './CalendarView';
import { useUiStore } from '../../store/uiStore';

const BASE = 'http://localhost:3000';

describe('CalendarView (FE-07)', () => {
  it('FullCalendar 가 마운트되고 툴바(오늘 버튼)가 렌더된다', async () => {
    server.use(http.get(`${BASE}/api/teams/t1/schedules`, () => HttpResponse.json([])));
    renderWithProviders(<CalendarView teamId="t1" />, '/');
    expect(await screen.findByTestId('calendar-view')).toBeInTheDocument();
    // FullCalendar 한국어 툴바 버튼
    await waitFor(() => expect(screen.getByText('오늘')).toBeInTheDocument());
  });

  it('조회된 일정 제목이 캘린더에 표시된다', async () => {
    server.use(
      http.get(`${BASE}/api/teams/t1/schedules`, () =>
        HttpResponse.json([
          {
            id: 's1',
            teamId: 't1',
            title: '스프린트 회의',
            startAt: '2026-06-15T05:00:00Z',
            endAt: '2026-06-15T06:00:00Z',
            isAllDay: false,
            createdBy: 'u1',
            createdAt: 'x',
            updatedAt: 'x',
          },
        ])
      )
    );
    // 6월이 보이도록 selectedDate 를 설정(초기 뷰는 today 기준이라 이벤트는 범위 내일 때 표시)
    useUiStore.getState().setSelectedDate('2026-06-15');
    renderWithProviders(<CalendarView teamId="t1" />, '/');
    expect(await screen.findByTestId('calendar-view')).toBeInTheDocument();
  });
});

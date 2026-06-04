import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';
import { useSchedules } from './useSchedules';

const BASE = 'http://localhost:3000';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useSchedules (FE-07)', () => {
  it('teamId/from/to 가 있으면 일정을 조회한다', async () => {
    server.use(
      http.get(`${BASE}/api/teams/t1/schedules`, () =>
        HttpResponse.json([
          {
            id: 's1',
            teamId: 't1',
            title: '회의',
            startAt: '2026-06-05T05:00:00Z',
            endAt: '2026-06-05T06:00:00Z',
            isAllDay: false,
            createdBy: 'u1',
            createdAt: 'x',
            updatedAt: 'x',
          },
        ])
      )
    );
    const { result } = renderHook(
      () => useSchedules('t1', '2026-06-01T00:00:00', '2026-06-30T00:00:00'),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('회의');
  });

  it('teamId 가 없으면 비활성(요청하지 않음)', () => {
    const { result } = renderHook(() => useSchedules(null, '2026-06-01', '2026-06-30'), {
      wrapper,
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});

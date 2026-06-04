/** 기간 범위 일정 조회 훅 (FE-07) — 팀 전환/일정 변경 시 무효화로 자동 갱신. */
import { useQuery } from '@tanstack/react-query';
import * as schedulesApi from '../../api/endpoints/schedules';

export function schedulesQueryKey(teamId: string | null, from: string, to: string) {
  return ['schedules', teamId, from, to] as const;
}

export function useSchedules(teamId: string | null, from: string | null, to: string | null) {
  return useQuery({
    queryKey: schedulesQueryKey(teamId, from ?? '', to ?? ''),
    queryFn: () => schedulesApi.listSchedules(teamId as string, from as string, to as string),
    enabled: Boolean(teamId && from && to),
  });
}

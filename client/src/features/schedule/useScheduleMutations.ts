/** 일정 생성/수정/삭제 mutation (FE-08) — 성공 시 일정 쿼리 무효화. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as schedulesApi from '../../api/endpoints/schedules';
import type {
  CreateScheduleRequest,
  ScheduleResponse,
  UpdateScheduleRequest,
} from '../../api/types';
import type { ApiError } from '../../api/client';

export function useScheduleMutations(teamId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schedules'] });

  const create = useMutation<ScheduleResponse, ApiError, CreateScheduleRequest>({
    mutationFn: (body) => schedulesApi.createSchedule(teamId, body),
    onSuccess: invalidate,
  });

  const update = useMutation<
    ScheduleResponse,
    ApiError,
    { scheduleId: string; body: UpdateScheduleRequest }
  >({
    mutationFn: ({ scheduleId, body }) => schedulesApi.updateSchedule(teamId, scheduleId, body),
    onSuccess: invalidate,
  });

  const remove = useMutation<void, ApiError, string>({
    mutationFn: (scheduleId) => schedulesApi.deleteSchedule(teamId, scheduleId),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

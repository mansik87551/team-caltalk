/** 변경요청 목록/생성/처리 (FE-11, FR-08/09 / BR-04/09) */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as scrApi from '../../api/endpoints/scheduleRequests';
import type {
  ChangeRequestStatus,
  CreateChangeRequestRequest,
  ProcessChangeRequestRequest,
} from '../../api/types';
import type { ApiError } from '../../api/client';

export function changeRequestsKey(teamId: string | null, status?: ChangeRequestStatus) {
  return ['changeRequests', teamId, status ?? 'all'] as const;
}

export function useChangeRequestsQuery(teamId: string | null, status?: ChangeRequestStatus) {
  return useQuery({
    queryKey: changeRequestsKey(teamId, status),
    queryFn: () => scrApi.listChangeRequests(teamId as string, status),
    enabled: Boolean(teamId),
  });
}

export function useChangeRequestMutations(teamId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['changeRequests'] });

  const create = useMutation<unknown, ApiError, CreateChangeRequestRequest>({
    mutationFn: (body) => scrApi.createChangeRequest(teamId, body),
    onSuccess: invalidate,
  });

  const process = useMutation<
    unknown,
    ApiError,
    { requestId: string; body: ProcessChangeRequestRequest }
  >({
    mutationFn: ({ requestId, body }) => scrApi.processChangeRequest(teamId, requestId, body),
    onSuccess: () => {
      invalidate();
      // 반영 시 일정도 갱신.
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  return { create, process };
}

/** 일정 변경요청 엔드포인트 (FE-02) */
import { apiClient } from '../client';
import type {
  ChangeRequestStatus,
  CreateChangeRequestRequest,
  ProcessChangeRequestRequest,
  ScheduleChangeRequest,
} from '../types';

export async function listChangeRequests(
  teamId: string,
  status?: ChangeRequestStatus
): Promise<ScheduleChangeRequest[]> {
  const { data } = await apiClient.get<ScheduleChangeRequest[]>(
    `/api/teams/${teamId}/schedule-change-requests`,
    { params: status ? { status } : undefined }
  );
  return data;
}

export async function createChangeRequest(
  teamId: string,
  body: CreateChangeRequestRequest
): Promise<ScheduleChangeRequest> {
  const { data } = await apiClient.post<ScheduleChangeRequest>(
    `/api/teams/${teamId}/schedule-change-requests`,
    body
  );
  return data;
}

export async function processChangeRequest(
  teamId: string,
  requestId: string,
  body: ProcessChangeRequestRequest
): Promise<ScheduleChangeRequest> {
  const { data } = await apiClient.patch<ScheduleChangeRequest>(
    `/api/teams/${teamId}/schedule-change-requests/${requestId}`,
    body
  );
  return data;
}

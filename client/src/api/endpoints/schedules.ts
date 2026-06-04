/** 일정 엔드포인트 (FE-02) */
import { apiClient } from '../client';
import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleResponse,
  UpdateScheduleRequest,
} from '../types';

export async function listSchedules(
  teamId: string,
  from: string,
  to: string
): Promise<Schedule[]> {
  const { data } = await apiClient.get<Schedule[]>(`/api/teams/${teamId}/schedules`, {
    params: { from, to },
  });
  return data;
}

export async function createSchedule(
  teamId: string,
  body: CreateScheduleRequest
): Promise<ScheduleResponse> {
  const { data } = await apiClient.post<ScheduleResponse>(`/api/teams/${teamId}/schedules`, body);
  return data;
}

export async function updateSchedule(
  teamId: string,
  scheduleId: string,
  body: UpdateScheduleRequest
): Promise<ScheduleResponse> {
  const { data } = await apiClient.put<ScheduleResponse>(
    `/api/teams/${teamId}/schedules/${scheduleId}`,
    body
  );
  return data;
}

export async function deleteSchedule(teamId: string, scheduleId: string): Promise<void> {
  await apiClient.delete(`/api/teams/${teamId}/schedules/${scheduleId}`);
}

/** 팀·멤버십 엔드포인트 (FE-02) */
import { apiClient } from '../client';
import type { Membership, TeamWithRole } from '../types';

export async function listMyTeams(): Promise<TeamWithRole[]> {
  const { data } = await apiClient.get<TeamWithRole[]>('/api/teams');
  return data;
}

export async function createTeam(name: string): Promise<TeamWithRole> {
  const { data } = await apiClient.post<TeamWithRole>('/api/teams', { name });
  return data;
}

export async function joinTeam(teamId: string): Promise<Membership> {
  const { data } = await apiClient.post<Membership>(`/api/teams/${teamId}/members`);
  return data;
}

export async function listMembers(teamId: string): Promise<Membership[]> {
  const { data } = await apiClient.get<Membership[]>(`/api/teams/${teamId}/members`);
  return data;
}

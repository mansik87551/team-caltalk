/** 내 소속 팀 목록 쿼리 (FE-06) */
import { useQuery } from '@tanstack/react-query';
import * as teamsApi from '../../api/endpoints/teams';

export const teamsQueryKey = ['teams'] as const;

export function useTeamsQuery() {
  return useQuery({
    queryKey: teamsQueryKey,
    queryFn: teamsApi.listMyTeams,
  });
}

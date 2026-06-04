/**
 * 현재 팀 컨텍스트의 역할 판별 훅 (FE-13)
 *
 * - currentTeamId 컨텍스트(FE-03)에서 파생하므로 팀 전환 시 자동 갱신된다.
 * - 역할 기반 노출은 UX 편의일 뿐 강제는 서버(BR-03/04).
 */
import { useCurrentTeam } from '../../hooks/useCurrentTeam';
import type { Role } from '../../api/types';

export function useRole(): { role: Role | null; isLeader: boolean; isMember: boolean } {
  const { role } = useCurrentTeam();
  return {
    role,
    isLeader: role === 'team_leader',
    isMember: role !== null,
  };
}

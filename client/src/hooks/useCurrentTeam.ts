/**
 * 현재 팀 컨텍스트/역할 노출 훅 (FE-03)
 *
 * - isLeader 는 권한 UI 노출 기준(서버측 강제와 별개의 UX 편의).
 */
import { useUiStore } from '../store/uiStore';

export function useCurrentTeam() {
  const teamId = useUiStore((s) => s.currentTeamId);
  const role = useUiStore((s) => s.currentRole);
  const setCurrentTeam = useUiStore((s) => s.setCurrentTeam);

  return {
    teamId,
    role,
    isLeader: role === 'team_leader',
    isMember: role !== null,
    setCurrentTeam,
  };
}

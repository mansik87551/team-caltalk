/** 팀 전환 + 최소 팀 생성 (FE-06) — currentTeamId 갱신으로 하위 영역 리렌더. */
import { useState, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as teamsApi from '../../api/endpoints/teams';
import { useCurrentTeam } from '../../hooks/useCurrentTeam';
import { teamsQueryKey } from './useTeamsQuery';
import type { TeamWithRole } from '../../api/types';

export function TeamSwitcher({ teams }: { teams: TeamWithRole[] }): ReactElement {
  const { teamId, setCurrentTeam } = useCurrentTeam();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const createMutation = useMutation({
    mutationFn: (name: string) => teamsApi.createTeam(name),
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
      setCurrentTeam(team.id, team.role);
      setNewName('');
    },
  });

  function onSelect(id: string) {
    const team = teams.find((t) => t.id === id);
    if (team) setCurrentTeam(team.id, team.role);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="team-switcher">
        팀 선택
      </label>
      <select
        id="team-switcher"
        aria-label="팀 선택"
        className="rounded border border-slate-300 px-2 py-1 text-sm"
        value={teamId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={teams.length === 0}
      >
        {teams.length === 0 && <option value="">팀 없음</option>}
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate(newName.trim());
        }}
      >
        <input
          aria-label="새 팀 이름"
          className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="새 팀 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newName.trim()}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          팀 생성
        </button>
      </form>
    </div>
  );
}

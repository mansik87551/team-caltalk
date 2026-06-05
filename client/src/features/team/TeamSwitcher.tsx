/** 팀 전환 + 생성 + 참여 (FE-06) — currentTeamId 갱신으로 하위 영역 리렌더.
 *
 * 채팅·일정은 팀 단위로 격리(BR-02)되므로, 다른 사용자와 함께 쓰려면 같은 팀에 속해야 한다.
 * 한 사용자가 팀을 만들고 팀 ID 를 공유하면, 다른 사용자가 그 ID 로 참여한다.
 */
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
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: (name: string) => teamsApi.createTeam(name),
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
      setCurrentTeam(team.id, team.role);
      setNewName('');
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => teamsApi.joinTeam(id),
    onSuccess: (membership) => {
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
      setCurrentTeam(membership.teamId, membership.role);
      setJoinId('');
    },
  });

  function onSelect(id: string) {
    const team = teams.find((t) => t.id === id);
    if (team) setCurrentTeam(team.id, team.role);
  }

  async function copyTeamId() {
    if (!teamId) return;
    try {
      await navigator.clipboard.writeText(teamId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 불가 환경 무시 */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      {/* 현재 팀 ID 공유(다른 사용자가 이 ID 로 참여) */}
      {teamId && (
        <button
          type="button"
          onClick={copyTeamId}
          title="현재 팀 ID 복사 — 다른 사용자에게 전달해 참여시키세요"
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          {copied ? '복사됨!' : '팀 ID 복사'}
        </button>
      )}

      {/* 새 팀 생성 */}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate(newName.trim());
        }}
      >
        <input
          aria-label="새 팀 이름"
          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
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

      {/* 팀 ID 로 참여 */}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (joinId.trim()) joinMutation.mutate(joinId.trim());
        }}
      >
        <input
          aria-label="참여할 팀 ID"
          className="w-44 rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="팀 ID로 참여"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
        />
        <button
          type="submit"
          disabled={joinMutation.isPending || !joinId.trim()}
          className="rounded bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          참여
        </button>
      </form>

      {joinMutation.isError && (
        <span role="alert" className="text-xs text-rose-600">
          참여 실패: 팀 ID를 확인하세요(이미 멤버이거나 존재하지 않음)
        </span>
      )}
    </div>
  );
}

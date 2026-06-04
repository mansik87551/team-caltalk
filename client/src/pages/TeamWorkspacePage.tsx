import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from '../components/WorkspaceLayout';
import { TeamSwitcher } from '../features/team/TeamSwitcher';
import { useTeamsQuery } from '../features/team/useTeamsQuery';
import { CalendarView } from '../features/calendar/CalendarView';
import { ScheduleModal } from '../features/schedule/ScheduleModal';
import { useAuth } from '../hooks/useAuth';
import { useCurrentTeam } from '../hooks/useCurrentTeam';
import type { Schedule } from '../api/types';

type ModalState = { mode: 'create' } | { mode: 'edit'; schedule: Schedule } | null;

/** 캘린더+채팅 통합 화면(핵심, UC-06). 채팅은 FE-09 에서 채운다. */
export default function TeamWorkspacePage(): ReactElement {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: teams = [], isLoading } = useTeamsQuery();
  const { teamId, role, isLeader, setCurrentTeam } = useCurrentTeam();
  const [modal, setModal] = useState<ModalState>(null);

  // 최초 로드 시 현재 팀이 없으면 첫 팀을 선택(하위 영역 컨텍스트 연결).
  useEffect(() => {
    if (!teamId && teams.length > 0) {
      setCurrentTeam(teams[0].id, teams[0].role);
    }
  }, [teamId, teams, setCurrentTeam]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-800">Team CalTalk</h1>
        <TeamSwitcher teams={teams} />
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-700">{user?.displayName ?? '사용자'}</span>
        {role && (
          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
            {isLeader ? '팀장' : '팀원'}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          로그아웃
        </button>
      </div>
    </div>
  );

  let calendarSlot: ReactElement;
  if (isLoading) {
    calendarSlot = <p className="text-sm text-slate-500">불러오는 중…</p>;
  } else if (teams.length === 0) {
    calendarSlot = (
      <p className="text-sm text-slate-500">소속된 팀이 없습니다. 새 팀을 만들어 시작하세요.</p>
    );
  } else {
    calendarSlot = (
      <div className="space-y-3">
        {/* 일정 추가는 팀장만 노출(BR-03, UX 편의) */}
        {isLeader && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setModal({ mode: 'create' })}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
            >
              일정 추가
            </button>
          </div>
        )}
        <CalendarView
          teamId={teamId}
          onSelectSchedule={(schedule) => {
            // 팀장만 수정 모달 진입(팀원은 열람만, BR-03)
            if (isLeader) setModal({ mode: 'edit', schedule });
          }}
        />
      </div>
    );
  }

  const chatSlot = <p className="text-sm text-slate-500">채팅 / Daily Chat Log (FE-09 예정)</p>;

  return (
    <>
      <WorkspaceLayout header={header} calendar={calendarSlot} chat={chatSlot} />
      {modal && teamId && (
        <ScheduleModal
          teamId={teamId}
          schedule={modal.mode === 'edit' ? modal.schedule : null}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

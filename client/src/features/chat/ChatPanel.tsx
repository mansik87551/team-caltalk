/**
 * 채팅 패널 (FE-09, UC-06 / SC-04) — 전역 selectedDate(targetDate) 기준 Daily Chat Log.
 *
 * 캘린더 날짜 선택 → selectedDate 변경 → 이 패널이 해당 날짜 대화로 자동 동기화.
 */
import type { ReactElement } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useDailyChatLog } from './useDailyChatLog';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatPanel({ teamId }: { teamId: string | null }): ReactElement {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: messages = [], isLoading } = useDailyChatLog(teamId, selectedDate);

  return (
    <div className="flex h-full flex-col" data-testid="chat-panel">
      <header className="border-b pb-2">
        <h2 className="text-sm font-semibold text-slate-700">채팅</h2>
        <p className="text-xs text-slate-500">대상 날짜: {selectedDate}</p>
      </header>

      <div className="flex-1 overflow-y-auto py-3">
        {isLoading ? (
          <p className="text-center text-sm text-slate-400">불러오는 중…</p>
        ) : (
          <MessageList messages={messages} currentUserId={currentUserId} />
        )}
      </div>

      {teamId && <MessageInput teamId={teamId} date={selectedDate} />}
    </div>
  );
}

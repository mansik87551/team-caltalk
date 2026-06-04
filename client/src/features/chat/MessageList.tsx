/** 메시지 목록 (FE-09) — createdAt 은 KST 표시, targetDate 그룹핑 키와 구분. */
import type { ReactElement } from 'react';
import { formatKstTime } from '../../lib/datetime';
import type { ChatMessage } from '../../api/types';

interface Props {
  messages: ChatMessage[];
  currentUserId?: string;
}

export function MessageList({ messages, currentUserId }: Props): ReactElement {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">이 날짜의 대화가 없습니다.</p>;
  }
  return (
    <ul className="space-y-2" aria-label="메시지 목록">
      {messages.map((m) => {
        const mine = m.senderId === currentUserId;
        return (
          <li key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                mine ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 border'
              }`}
            >
              {m.content}
            </div>
            {/* createdAt(불변 UTC) → KST 표시 */}
            <span className="mt-0.5 text-[10px] text-slate-400">{formatKstTime(m.createdAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}

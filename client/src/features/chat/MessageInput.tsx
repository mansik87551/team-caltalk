/** 메시지 입력 (FE-09) — 전송 시 selectedDate 를 targetDate 로 부여. */
import { useState, type ReactElement } from 'react';
import { usePostMessage } from './useDailyChatLog';

interface Props {
  teamId: string;
  date: string;
}

export function MessageInput({ teamId, date }: Props): ReactElement {
  const [text, setText] = useState('');
  const mutation = usePostMessage(teamId, date);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    mutation.mutate(content, { onSuccess: () => setText('') });
  }

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="chat-input">
        메시지 입력
      </label>
      <input
        id="chat-input"
        className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        placeholder="메시지를 입력하세요"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        disabled={mutation.isPending || !text.trim()}
        className="rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
      >
        전송
      </button>
    </form>
  );
}

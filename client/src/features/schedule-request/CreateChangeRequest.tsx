/**
 * 변경요청 생성 모달 (FE-11, UC-04 / SC-05 / BR-04)
 *
 * - 팀원이 대상 Schedule 에 대해 변경을 요청한다. content 로 채팅 메시지를 생성하고
 *   서버가 originMessageId 로 연결한다("왜 바뀌었는가" 보존, 핵심 차별점).
 */
import { useState, type ReactElement } from 'react';
import { useChangeRequestMutations } from './useChangeRequests';
import { formatInKst } from '../../lib/datetime';
import type { Schedule } from '../../api/types';

interface Props {
  teamId: string;
  schedule: Schedule;
  onClose: () => void;
}

export function CreateChangeRequest({ teamId, schedule, onClose }: Props): ReactElement {
  const { create } = useChangeRequestMutations(teamId);
  const [content, setContent] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    // content 만 보내면 서버가 채팅 메시지를 생성해 originMessageId 로 연결한다.
    create.mutate(
      { scheduleId: schedule.id, requestContent: text, content: text },
      { onSuccess: onClose }
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="변경 요청"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">변경 요청</h2>
        <p className="mt-1 text-sm text-slate-500">
          대상 일정: {schedule.title} ({formatInKst(schedule.startAt, 'MM-dd HH:mm')}~
          {formatInKst(schedule.endAt, 'HH:mm')})
        </p>

        {create.isError && (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {create.error.message}
          </p>
        )}

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            요청 내용
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="예) 회의를 한 시간 미뤄주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={create.isPending || !content.trim()}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              요청 보내기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

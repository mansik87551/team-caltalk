/**
 * 변경요청 목록/처리 패널 (FE-11, UC-05 / SC-05/06 / BR-09)
 *
 * - 팀장: requested 요청을 반영(Applied)/반려(Rejected) 처리. 종결 요청은 처리 버튼 비활성(AC-08).
 * - 팀원: 목록 열람만(처리 버튼 미노출, BR-04 UX). 강제는 서버.
 */
import { useState, type ReactElement } from 'react';
import { useChangeRequestsQuery, useChangeRequestMutations } from './useChangeRequests';
import { toUtcIso } from '../../lib/datetime';
import type { ScheduleChangeRequest } from '../../api/types';

const STATUS_LABEL: Record<string, string> = {
  requested: '요청됨',
  applied: '반영됨',
  rejected: '반려됨',
};

function RequestRow({
  request,
  isLeader,
  onApply,
  onReject,
  pending,
}: {
  request: ScheduleChangeRequest;
  isLeader: boolean;
  onApply: (id: string, startAt: string, endAt: string) => void;
  onReject: (id: string, reason: string) => void;
  pending: boolean;
}): ReactElement {
  const [reason, setReason] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const terminal = request.status !== 'requested';

  return (
    <li className="rounded border border-slate-200 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-700">{request.requestContent}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {STATUS_LABEL[request.status]}
        </span>
      </div>

      {request.status === 'rejected' && request.rejectReason && (
        <p className="mt-1 text-xs text-rose-600">반려 사유: {request.rejectReason}</p>
      )}

      {isLeader && !terminal && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              시작
              <input
                type="datetime-local"
                aria-label="반영 시작"
                className="ml-1 rounded border px-1 text-xs"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              종료
              <input
                type="datetime-local"
                aria-label="반영 종료"
                className="ml-1 rounded border px-1 text-xs"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={pending || !startAt || !endAt}
              onClick={() => onApply(request.id, startAt, endAt)}
              className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              반영
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="반려 사유"
              className="flex-1 rounded border px-2 py-1 text-xs"
              placeholder="반려 사유(선택)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => onReject(request.id, reason)}
              className="rounded bg-rose-600 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              반려
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function RequestProcessPanel({
  teamId,
  isLeader,
}: {
  teamId: string;
  isLeader: boolean;
}): ReactElement {
  const { data: requests = [], isLoading } = useChangeRequestsQuery(teamId);
  const { process } = useChangeRequestMutations(teamId);

  function handleApply(requestId: string, startAt: string, endAt: string) {
    process.mutate({
      requestId,
      body: { action: 'applied', scheduleUpdate: { startAt: toUtcIso(startAt), endAt: toUtcIso(endAt) } },
    });
  }
  function handleReject(requestId: string, reason: string) {
    process.mutate({ requestId, body: { action: 'rejected', rejectReason: reason || undefined } });
  }

  return (
    <section aria-label="변경 요청" className="rounded border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-semibold text-slate-700">변경 요청</h3>
      {isLoading ? (
        <p className="mt-2 text-xs text-slate-400">불러오는 중…</p>
      ) : requests.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">변경 요청이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              isLeader={isLeader}
              onApply={handleApply}
              onReject={handleReject}
              pending={process.isPending}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

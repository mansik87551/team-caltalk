/**
 * 일정 등록/수정 모달 (FE-08, UC-02 / SC-02/03 / BR-06/07/08)
 *
 * - 로컬(KST) 입력 → UTC ISO 변환(FE-05) 후 전송.
 * - 서버 conflicts[] 경고는 차단하지 않고 표시(BR-08). 충돌 없으면 저장 후 닫힘.
 * - 팀장 한정 노출은 호출 측에서 제어(BR-03, UX 편의).
 */
import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { scheduleFormSchema, type ScheduleFormValues } from './scheduleSchema';
import { useScheduleMutations } from './useScheduleMutations';
import { toUtcIso, formatInKst } from '../../lib/datetime';
import { useNotificationStore } from '../../store/notificationStore';
import type { ConflictInfo, Schedule } from '../../api/types';

interface Props {
  teamId: string;
  schedule?: Schedule | null;
  onClose: () => void;
}

const inputClass =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none';

function toLocalInput(utc: string): string {
  return formatInKst(utc, "yyyy-MM-dd'T'HH:mm");
}

export function ScheduleModal({ teamId, schedule, onClose }: Props): ReactElement {
  const isEdit = Boolean(schedule);
  const { create, update, remove } = useScheduleMutations(teamId);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const addNotice = useNotificationStore((s) => s.add);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: schedule
      ? {
          title: schedule.title,
          startAt: toLocalInput(schedule.startAt),
          endAt: toLocalInput(schedule.endAt),
          isAllDay: schedule.isAllDay,
        }
      : { title: '', startAt: '', endAt: '', isAllDay: false },
  });

  function onSubmit(values: ScheduleFormValues) {
    const body = {
      title: values.title,
      startAt: toUtcIso(values.startAt),
      endAt: toUtcIso(values.endAt),
      isAllDay: values.isAllDay,
    };
    const handleResult = (res: { conflicts: ConflictInfo[] }) => {
      if (res.conflicts.length > 0) {
        setConflicts(res.conflicts);
        addNotice('warning', `${res.conflicts.length}건의 일정 충돌이 있습니다(저장됨).`);
      } else {
        onClose();
      }
    };
    if (isEdit && schedule) {
      update.mutate({ scheduleId: schedule.id, body }, { onSuccess: handleResult });
    } else {
      create.mutate(body, { onSuccess: handleResult });
    }
  }

  const pending = create.isPending || update.isPending || remove.isPending;
  const serverError = create.error ?? update.error ?? remove.error;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? '일정 수정' : '일정 등록'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">{isEdit ? '일정 수정' : '일정 등록'}</h2>

        {serverError && (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError.message}
          </p>
        )}

        {conflicts.length > 0 && (
          <div className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">충돌하는 일정이 있습니다(저장됨):</p>
            <ul className="mt-1 list-disc pl-5">
              {conflicts.map((c) => (
                <li key={c.scheduleId}>
                  {c.title} ({formatInKst(c.startAt, 'MM-dd HH:mm')}~{formatInKst(c.endAt, 'HH:mm')})
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded bg-amber-600 px-3 py-1 text-xs text-white"
            >
              확인
            </button>
          </div>
        )}

        {conflicts.length === 0 && (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                제목
                <input className={inputClass} {...register('title')} />
              </label>
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                시작 일시
                <input type="datetime-local" className={inputClass} {...register('startAt')} />
              </label>
              {errors.startAt && (
                <p className="mt-1 text-xs text-red-600">{errors.startAt.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                종료 일시
                <input type="datetime-local" className={inputClass} {...register('endAt')} />
              </label>
              {errors.endAt && <p className="mt-1 text-xs text-red-600">{errors.endAt.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('isAllDay')} />
              종일 일정
            </label>

            <div className="flex items-center justify-between pt-2">
              {isEdit && schedule ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove.mutate(schedule.id, { onSuccess: onClose })}
                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  삭제
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isEdit ? '수정' : '등록'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

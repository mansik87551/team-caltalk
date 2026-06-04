/** 통지 토스트 스택 (FE-12) — 충돌은 경고 톤, 흐름을 막지 않음. */
import type { ReactElement } from 'react';
import { useNotificationStore } from '../../store/notificationStore';

export function NotificationToasts(): ReactElement | null {
  const notices = useNotificationStore((s) => s.notices);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (notices.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" aria-label="통지">
      {notices.map((n) => (
        <div
          key={n.id}
          role="status"
          className={`flex items-start justify-between rounded px-3 py-2 text-sm shadow ${
            n.level === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-slate-800 text-white'
          }`}
        >
          <span>{n.message}</span>
          <button
            type="button"
            aria-label="통지 닫기"
            onClick={() => dismiss(n.id)}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

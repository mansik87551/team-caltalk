/**
 * 화면 내 통지 스토어 (FE-12, OI-5) — 세션 동안만 유지(영속화 없음).
 *
 * - add: 동일 메시지는 중복 없이 누적(중복 시 무시).
 * - dismiss/clear: 사용자 확인 시 해제.
 */
import { create } from 'zustand';

export type NoticeLevel = 'warning' | 'info';

export interface Notice {
  id: number;
  level: NoticeLevel;
  message: string;
}

let nextId = 1;

interface NotificationState {
  notices: Notice[];
  add: (level: NoticeLevel, message: string) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notices: [],
  add: (level, message) => {
    // 동일 메시지 중복 누적 방지.
    if (get().notices.some((n) => n.message === message)) return;
    set((s) => ({ notices: [...s.notices, { id: nextId++, level, message }] }));
  },
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  clear: () => set({ notices: [] }),
}));

/**
 * UI 컨텍스트 스토어 (FE-03, UC-06)
 *
 * - selectedDate: targetDate(YYYY-MM-DD)의 전역 단일 출처(SSOT). 캘린더 선택 → 채팅(Daily Chat Log) 동기화.
 * - currentTeamId / currentRole: 현재 팀 컨텍스트와 역할(권한 UI 노출 기준일 뿐, 강제는 서버측).
 * - 시간대 변환 자체는 lib/datetime 에서만 수행한다.
 */
import { create } from 'zustand';
import type { Role } from '../api/types';
import { selectedDateToTargetDate } from '../lib/datetime';

function today(): string {
  return selectedDateToTargetDate(new Date());
}

interface UiState {
  selectedDate: string;
  currentTeamId: string | null;
  currentRole: Role | null;
  setSelectedDate: (date: string) => void;
  setCurrentTeam: (teamId: string | null, role: Role | null) => void;
  reset: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedDate: today(),
  currentTeamId: null,
  currentRole: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentTeam: (currentTeamId, currentRole) => set({ currentTeamId, currentRole }),
  reset: () => set({ selectedDate: today(), currentTeamId: null, currentRole: null }),
}));

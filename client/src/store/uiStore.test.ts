import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

beforeEach(() => {
  useUiStore.getState().reset();
});

describe('uiStore (FE-03)', () => {
  it('selectedDate 기본값은 YYYY-MM-DD 형식', () => {
    expect(useUiStore.getState().selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('setSelectedDate 로 전역 선택 날짜 갱신(캘린더↔채팅 SSOT)', () => {
    useUiStore.getState().setSelectedDate('2026-06-05');
    expect(useUiStore.getState().selectedDate).toBe('2026-06-05');
  });

  it('setCurrentTeam 로 팀/역할 설정', () => {
    useUiStore.getState().setCurrentTeam('team-1', 'team_leader');
    const s = useUiStore.getState();
    expect(s.currentTeamId).toBe('team-1');
    expect(s.currentRole).toBe('team_leader');
  });

  it('reset 시 팀 컨텍스트 초기화', () => {
    useUiStore.getState().setCurrentTeam('team-1', 'team_member');
    useUiStore.getState().setSelectedDate('2020-01-01');
    useUiStore.getState().reset();
    const s = useUiStore.getState();
    expect(s.currentTeamId).toBeNull();
    expect(s.currentRole).toBeNull();
    expect(s.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { useRole } from './useRole';
import { RoleGate } from './RoleGate';
import { useUiStore } from '../../store/uiStore';

beforeEach(() => useUiStore.getState().reset());

describe('useRole (FE-13)', () => {
  it('team_leader 컨텍스트에서 isLeader=true', () => {
    useUiStore.getState().setCurrentTeam('t1', 'team_leader');
    const { result } = renderHook(() => useRole());
    expect(result.current.isLeader).toBe(true);
    expect(result.current.isMember).toBe(true);
  });

  it('team_member 컨텍스트에서 isLeader=false', () => {
    useUiStore.getState().setCurrentTeam('t1', 'team_member');
    const { result } = renderHook(() => useRole());
    expect(result.current.isLeader).toBe(false);
    expect(result.current.isMember).toBe(true);
  });
});

describe('RoleGate (FE-13)', () => {
  it('허용 역할이면 children 을, 아니면 fallback 을 렌더(UX 표시 정리)', () => {
    useUiStore.getState().setCurrentTeam('t1', 'team_leader');
    const { rerender } = render(
      <RoleGate allow="team_leader" fallback={<span>숨김</span>}>
        <button>일정 추가</button>
      </RoleGate>
    );
    expect(screen.getByRole('button', { name: '일정 추가' })).toBeInTheDocument();

    useUiStore.getState().setCurrentTeam('t1', 'team_member');
    rerender(
      <RoleGate allow="team_leader" fallback={<span>숨김</span>}>
        <button>일정 추가</button>
      </RoleGate>
    );
    expect(screen.queryByRole('button', { name: '일정 추가' })).not.toBeInTheDocument();
    expect(screen.getByText('숨김')).toBeInTheDocument();
  });

  it('역할 배열 허용을 지원한다', () => {
    useUiStore.getState().setCurrentTeam('t1', 'team_member');
    render(
      <RoleGate allow={['team_leader', 'team_member']}>
        <span>공통</span>
      </RoleGate>
    );
    expect(screen.getByText('공통')).toBeInTheDocument();
  });
});

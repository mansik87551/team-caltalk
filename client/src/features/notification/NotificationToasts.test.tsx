import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationToasts } from './NotificationToasts';
import { SOCKET_NOTIFICATIONS } from './socketNotifications';
import { useNotificationStore } from '../../store/notificationStore';

beforeEach(() => useNotificationStore.getState().clear());

describe('NotificationToasts (FE-12 / SC-03)', () => {
  it('통지가 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<NotificationToasts />);
    expect(container).toBeEmptyDOMElement();
  });

  it('스토어의 통지를 표시하고 닫기 시 제거한다', async () => {
    useNotificationStore.getState().add('warning', '일정 충돌이 감지되었습니다(저장됨).');
    const u = userEvent.setup();
    render(<NotificationToasts />);
    expect(screen.getByText('일정 충돌이 감지되었습니다(저장됨).')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: '통지 닫기' }));
    expect(screen.queryByText('일정 충돌이 감지되었습니다(저장됨).')).not.toBeInTheDocument();
  });
});

describe('socketNotifications 매핑 (FE-12)', () => {
  it('충돌은 경고, 변경요청 이벤트는 정보 톤으로 매핑된다', () => {
    expect(SOCKET_NOTIFICATIONS['schedule:conflict'].level).toBe('warning');
    expect(SOCKET_NOTIFICATIONS['request:applied'].level).toBe('info');
    expect(SOCKET_NOTIFICATIONS['request:rejected']).toBeTruthy();
    expect(SOCKET_NOTIFICATIONS['request:created']).toBeTruthy();
  });
});

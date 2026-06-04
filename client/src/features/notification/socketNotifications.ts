/** 소켓 도메인 이벤트 → 화면 통지 매핑 (FE-12, 순수). */
import type { NoticeLevel } from '../../store/notificationStore';

export const SOCKET_NOTIFICATIONS: Record<string, { level: NoticeLevel; message: string }> = {
  // 충돌은 차단이 아니라 경고(BR-08).
  'schedule:conflict': { level: 'warning', message: '일정 충돌이 감지되었습니다(저장됨).' },
  'request:created': { level: 'info', message: '새 변경 요청이 도착했습니다.' },
  'request:applied': { level: 'info', message: '변경 요청이 반영되었습니다.' },
  'request:rejected': { level: 'info', message: '변경 요청이 반려되었습니다.' },
};

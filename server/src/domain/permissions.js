'use strict';

/**
 * 권한 매트릭스 도메인 (BR-03, docs/1 §5 — 권한 정책 SSOT)
 *
 * 순수 함수. 권한 매트릭스를 코드에 그대로 표현한다.
 * 권한은 서버측에서만 강제된다(Hard Rule). 프론트의 역할 기반 노출은 UX 편의일 뿐이다.
 *
 * 역할: team_leader / team_member (한 팀에서 하나의 역할, BR-10).
 * 인증·팀 소속 전제(BR-01/02)는 미들웨어가 별도로 강제하며, 여기서는 역할↔행동만 판정한다.
 */

const ROLE = Object.freeze({
  LEADER: 'team_leader',
  MEMBER: 'team_member',
});

// 정규 액션 식별자. Service/Controller 에서 이 상수를 참조한다.
const ACTION = Object.freeze({
  SCHEDULE_READ: 'schedule:read',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_UPDATE: 'schedule:update',
  SCHEDULE_DELETE: 'schedule:delete',
  CHAT_WRITE: 'chat:write',
  CHAT_READ: 'chat:read',
  DAILY_CHAT_LOG_READ: 'dailyChatLog:read',
  CHANGE_REQUEST_CREATE: 'changeRequest:create',
  CHANGE_REQUEST_PROCESS: 'changeRequest:process',
});

// 권한 매트릭스(docs/1 §5). 팀장은 모든 액션 허용.
const LEADER_ACTIONS = new Set(Object.values(ACTION));

// 팀원은 조회·채팅·변경요청 생성만 허용. 일정 CUD·변경요청 처리는 거부(BR-03).
const MEMBER_ACTIONS = new Set([
  ACTION.SCHEDULE_READ,
  ACTION.CHAT_WRITE,
  ACTION.CHAT_READ,
  ACTION.DAILY_CHAT_LOG_READ,
  ACTION.CHANGE_REQUEST_CREATE,
]);

const MATRIX = Object.freeze({
  [ROLE.LEADER]: LEADER_ACTIONS,
  [ROLE.MEMBER]: MEMBER_ACTIONS,
});

/**
 * role 이 action 을 수행할 수 있는지 판정한다(BR-03, 권한 매트릭스 SSOT).
 * 알 수 없는 역할/액션은 거부(false).
 * @param {string} role - 'team_leader' | 'team_member'
 * @param {string} action - ACTION 상수 중 하나
 * @returns {boolean}
 */
function can(role, action) {
  const actions = MATRIX[role];
  if (!actions) return false;
  return actions.has(action);
}

module.exports = { ROLE, ACTION, can };

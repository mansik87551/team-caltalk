'use strict';

/**
 * ScheduleChangeRequest 상태 전이 도메인 (BR-09, docs/1 §6.2)
 *
 * 순수 함수. 상태 전이표를 SSOT 로 그대로 표현한다.
 *
 * 상태: requested(요청됨) → applied(반영됨) | rejected(반려됨)
 * - requested 에서만 applied/rejected 로 전이 가능.
 * - applied, rejected 는 종결 상태이며 어떤 전이도 거부한다(AC-08, 재전이 시 409).
 */

const STATUS = Object.freeze({
  REQUESTED: 'requested',
  APPLIED: 'applied',
  REJECTED: 'rejected',
});

// 허용 전이표: 현재 상태 → 가능한 다음 상태 집합.
const ALLOWED_TRANSITIONS = Object.freeze({
  [STATUS.REQUESTED]: Object.freeze([STATUS.APPLIED, STATUS.REJECTED]),
  [STATUS.APPLIED]: Object.freeze([]),
  [STATUS.REJECTED]: Object.freeze([]),
});

/**
 * 종결(terminal) 상태 여부. applied/rejected 는 종결이다.
 * @param {string} status
 * @returns {boolean}
 */
function isTerminal(status) {
  return status === STATUS.APPLIED || status === STATUS.REJECTED;
}

/**
 * current → next 전이가 허용되는지 판정한다(BR-09).
 * 알 수 없는 상태나 종결 상태에서의 전이는 false.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
function canTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus);
}

module.exports = { STATUS, canTransition, isTerminal };

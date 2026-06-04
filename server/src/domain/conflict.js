'use strict';

/**
 * 일정 충돌 판정 도메인 (BR-07, docs/1 §6.1)
 *
 * 순수 함수만 둔다(I/O 없음, Date.now() 금지 — 현재 시각 주입 불필요). docs/4 §2.1.
 *
 * 충돌 정의(엄격한 `<`, 경계 접촉은 비충돌):
 *   conflict(A, B) ≡ A.startAt < B.endAt AND B.startAt < A.endAt
 * 비교는 UTC 분(minute) 단위(utils/time 의 overlaps 가 절삭 후 비교).
 * 종일 일정(isAllDay)은 [당일 00:00 UTC, 다음날 00:00 UTC) 반열린 구간으로 정규화한다.
 */

const { overlaps, normalizeAllDay } = require('../utils/time');

/**
 * Schedule 을 비교용 [startAt, endAt) 구간으로 정규화한다.
 * 종일 일정은 startAt 의 날짜를 기준으로 [00:00, 익일 00:00) 으로 변환한다(BR-07).
 * @param {{ startAt: Date|string|number, endAt?: Date|string|number, isAllDay?: boolean }} schedule
 * @returns {{ startAt: Date, endAt: Date }}
 */
function toInterval(schedule) {
  if (schedule.isAllDay) {
    return normalizeAllDay(schedule.startAt);
  }
  return { startAt: schedule.startAt, endAt: schedule.endAt };
}

/**
 * 두 Schedule A, B 가 충돌하는지 판정한다(BR-07). 경계 접촉은 충돌이 아니다(AC-02).
 * 자기 자신 비교 제외는 호출 측(findConflicts)에서 처리한다.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function detectConflict(a, b) {
  return overlaps(toInterval(a), toInterval(b));
}

/**
 * 후보 Schedule 과 기존 Schedule 목록을 비교해 충돌하는 항목만 반환한다.
 * 수정 시나리오의 자기 자신 제외(AC-03)는 selfId(또는 candidate.scheduleId)로 처리한다.
 * @param {object} candidate - 새로/수정 등록하려는 Schedule
 * @param {Array<object>} others - 같은 팀의 기존 Schedule 목록
 * @param {{ selfId?: string }} [opts] - 비교에서 제외할 scheduleId(보통 수정 대상 자신)
 * @returns {Array<object>} 충돌하는 기존 Schedule 들(경고용, BR-08)
 */
function findConflicts(candidate, others, opts = {}) {
  const selfId = opts.selfId != null ? opts.selfId : candidate.scheduleId;
  const candInterval = toInterval(candidate);
  return (others || []).filter((other) => {
    // 자기 자신은 비교 대상에서 제외(AC-03).
    if (selfId != null && other.scheduleId === selfId) return false;
    return overlaps(candInterval, toInterval(other));
  });
}

module.exports = { detectConflict, findConflicts, toInterval };

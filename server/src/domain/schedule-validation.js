'use strict';

/**
 * 일정 유효성 도메인 (BR-06, docs/1 §10 AC-04)
 *
 * 순수 함수. HTTP 관심사(AppError)를 알지 못한다 — 검증 결과 객체를 반환하고,
 * 상태코드 매핑은 Service 계층이 담당한다(docs/4 §2.1 레이어링).
 *
 * 규칙: endAt 은 startAt 보다 이후여야 한다(startAt < endAt). 비교는 UTC 분 단위.
 * 동일하거나 역전된 경우 무효(AC-04).
 */

const { toEpochMinute } = require('../utils/time');

/**
 * @param {{ startAt: Date|string|number, endAt: Date|string|number }} schedule
 * @returns {{ valid: boolean, code?: string, message?: string }}
 */
function validateSchedule(schedule) {
  if (!schedule || schedule.startAt == null || schedule.endAt == null) {
    return { valid: false, code: 'VALIDATION_ERROR', message: 'startAt, endAt 은 필수입니다' };
  }

  let start;
  let end;
  try {
    start = toEpochMinute(schedule.startAt);
    end = toEpochMinute(schedule.endAt);
  } catch (err) {
    return { valid: false, code: 'VALIDATION_ERROR', message: '유효하지 않은 일시 형식입니다' };
  }

  // BR-06: startAt < endAt (분 단위). 같거나 역전이면 무효(AC-04).
  if (start >= end) {
    return {
      valid: false,
      code: 'VALIDATION_ERROR',
      message: 'endAt 은 startAt 보다 이후여야 합니다(startAt < endAt)',
    };
  }

  return { valid: true };
}

module.exports = { validateSchedule };

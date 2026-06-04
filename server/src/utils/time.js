'use strict';

/**
 * UTC 시간 유틸 (BE-01, BR-07 / NFR-05 / docs/4 §5.3 Hard Rule)
 *
 * - 모든 일시는 UTC 로 다룬다. 시간대 변환은 프론트엔드 표시 계층에서만 일어난다.
 * - 충돌 판정(BR-07)은 "UTC 분(minute) 단위"로 비교한다. 여기의 절삭 유틸이 그 기준점이다.
 * - 이 모듈은 순수 함수만 둔다(I/O 없음, 현재 시각은 인자로 주입). 그래야 단위 테스트가 저렴하다.
 */

/**
 * 입력을 UTC Date 로 정규화한다.
 * @param {Date|string|number} value - Date, ISO 문자열, epoch millis
 * @returns {Date}
 * @throws {TypeError} 파싱 불가한 값
 */
function toUtcDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(`유효하지 않은 일시 값입니다: ${String(value)}`);
  }
  return d;
}

/**
 * 초·밀리초를 버리고 분 단위로 절삭한 새 Date(UTC)를 반환한다.
 * 충돌 비교 전 양쪽 경계를 동일 기준으로 맞추는 데 쓴다(BR-07).
 * @param {Date|string|number} value
 * @returns {Date}
 */
function truncateToMinute(value) {
  const d = toUtcDate(value);
  return new Date(Math.floor(d.getTime() / 60000) * 60000);
}

/**
 * 절삭된 epoch 분(minute) 정수를 반환한다(1970-01-01 UTC 기준 분).
 * 정수 비교가 필요한 충돌 로직에서 사용한다.
 * @param {Date|string|number} value
 * @returns {number}
 */
function toEpochMinute(value) {
  return Math.floor(toUtcDate(value).getTime() / 60000);
}

/**
 * 종일 일정을 반열린 UTC 구간 [00:00, 익일 00:00) 으로 정규화한다(BR-07).
 * @param {Date|string|number} dayStart - 해당 날짜(시각은 무시하고 UTC 자정으로 맞춤)
 * @returns {{ startAt: Date, endAt: Date }}
 */
function normalizeAllDay(dayStart) {
  const d = toUtcDate(dayStart);
  const startAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
  return { startAt, endAt };
}

/**
 * 두 구간의 겹침 여부(BR-07): A.start < B.end AND B.start < A.end (엄격한 <).
 * 경계 접촉(A.end == B.start)은 겹치지 않는다(AC-02). UTC 분 단위로 비교한다.
 * @param {{startAt: Date|string|number, endAt: Date|string|number}} a
 * @param {{startAt: Date|string|number, endAt: Date|string|number}} b
 * @returns {boolean}
 */
function overlaps(a, b) {
  const aStart = toEpochMinute(a.startAt);
  const aEnd = toEpochMinute(a.endAt);
  const bStart = toEpochMinute(b.startAt);
  const bEnd = toEpochMinute(b.endAt);
  return aStart < bEnd && bStart < aEnd;
}

module.exports = {
  toUtcDate,
  truncateToMinute,
  toEpochMinute,
  normalizeAllDay,
  overlaps,
};

/**
 * 시간대 변환 유틸 (FE-05, NFR-05 / CLAUDE.md 불변식)
 *
 * Hard Rule: 시간대 변환은 오직 이 모듈에서만 일어난다. 다른 모듈은 UTC ISO 문자열만 주고받고,
 * 표시·입력 변환은 전부 여기로 위임한다.
 *
 * - 서버 저장/전송은 항상 UTC(timestamptz / ISO 8601 Z).
 * - 화면 표시는 KST(Asia/Seoul, UTC+9, DST 없음)로 변환.
 * - targetDate 는 달력 날짜(YYYY-MM-DD)이며 KST 기준으로 산출한다(Daily Chat Log 그룹핑 키).
 */

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const KST = 'Asia/Seoul';

/** UTC ISO(또는 Date)를 KST 로 포맷한다. 기본 'yyyy-MM-dd HH:mm'. */
export function formatInKst(utc: string | Date, fmt = 'yyyy-MM-dd HH:mm'): string {
  return formatInTimeZone(utc, KST, fmt);
}

/** UTC → KST 'HH:mm'. */
export function formatKstTime(utc: string | Date): string {
  return formatInTimeZone(utc, KST, 'HH:mm');
}

/** UTC → KST 'yyyy-MM-dd'. */
export function formatKstDate(utc: string | Date): string {
  return formatInTimeZone(utc, KST, 'yyyy-MM-dd');
}

/**
 * KST 벽시계(datetime-local 입력 'yyyy-MM-ddTHH:mm' 등)를 UTC ISO 문자열로 변환(서버 전송용).
 * @example toUtcIso('2026-06-05T14:00') -> '2026-06-05T05:00:00.000Z'
 */
export function toUtcIso(kstLocal: string): string {
  return fromZonedTime(kstLocal, KST).toISOString();
}

/**
 * UTC 시점이 귀속되는 KST 달력 날짜(YYYY-MM-DD). createdAt → Daily Chat Log 날짜 산출 등.
 * @example utcToTargetDate('2026-06-05T15:30:00Z') -> '2026-06-06' (KST 00:30)
 */
export function utcToTargetDate(utc: string | Date): string {
  return formatInTimeZone(utc, KST, 'yyyy-MM-dd');
}

/**
 * 사용자가 선택한 캘린더 Date 객체를 KST 기준 targetDate(YYYY-MM-DD)로 산출한다.
 * 캘린더에서 고른 "그 날짜"를 서버 그룹핑 키로 보낼 때 사용.
 */
export function selectedDateToTargetDate(date: Date): string {
  return formatInTimeZone(date, KST, 'yyyy-MM-dd');
}

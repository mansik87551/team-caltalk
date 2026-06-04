import { describe, it, expect } from 'vitest';
import {
  formatInKst,
  formatKstTime,
  formatKstDate,
  toUtcIso,
  utcToTargetDate,
  selectedDateToTargetDate,
} from './datetime';

describe('datetime (FE-05 / NFR-05)', () => {
  describe('UTC → KST 표시', () => {
    it('05:00Z → KST 14:00 (UTC+9)', () => {
      expect(formatInKst('2026-06-05T05:00:00Z')).toBe('2026-06-05 14:00');
      expect(formatKstTime('2026-06-05T05:00:00Z')).toBe('14:00');
    });

    it('자정 경계: 15:30Z → KST 다음날 00:30', () => {
      expect(formatInKst('2026-06-05T15:30:00Z')).toBe('2026-06-06 00:30');
    });

    it('formatKstDate: 16:00Z → KST 날짜 다음날', () => {
      expect(formatKstDate('2026-06-05T16:00:00Z')).toBe('2026-06-06');
    });
  });

  describe('로컬(KST) 입력 → UTC ISO (서버 전송)', () => {
    it('KST 14:00 → 05:00Z', () => {
      expect(toUtcIso('2026-06-05T14:00')).toBe('2026-06-05T05:00:00.000Z');
    });

    it('KST 00:30 → 전날 15:30Z', () => {
      expect(toUtcIso('2026-06-06T00:30')).toBe('2026-06-05T15:30:00.000Z');
    });

    it('toUtcIso/formatInKst 왕복 일관성', () => {
      const utc = toUtcIso('2026-12-31T23:59');
      expect(formatInKst(utc)).toBe('2026-12-31 23:59');
    });
  });

  describe('targetDate(YYYY-MM-DD) KST 산출', () => {
    it('utcToTargetDate: 15:30Z → KST 달력 다음날', () => {
      expect(utcToTargetDate('2026-06-05T15:30:00Z')).toBe('2026-06-06');
    });

    it('utcToTargetDate: 같은 KST 날짜 안의 시각', () => {
      expect(utcToTargetDate('2026-06-05T05:00:00Z')).toBe('2026-06-05');
    });

    it('selectedDateToTargetDate: KST 정오 Date → 그 날짜', () => {
      // UTC 03:00 == KST 12:00, 같은 날
      expect(selectedDateToTargetDate(new Date('2026-06-05T03:00:00Z'))).toBe('2026-06-05');
    });
  });
});

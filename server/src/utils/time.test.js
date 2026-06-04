import { describe, it, expect } from 'vitest';
import timeUtil from './time.js';

const { toUtcDate, truncateToMinute, toEpochMinute, normalizeAllDay, overlaps } = timeUtil;

describe('time util (BE-01)', () => {
  describe('toUtcDate', () => {
    it('ISO 문자열을 Date 로 정규화한다', () => {
      const d = toUtcDate('2026-06-04T10:30:00.000Z');
      expect(d.getTime()).toBe(Date.UTC(2026, 5, 4, 10, 30, 0));
    });

    it('유효하지 않은 값은 거부한다', () => {
      expect(() => toUtcDate('not-a-date')).toThrow(/유효하지 않은/);
    });
  });

  describe('truncateToMinute / toEpochMinute', () => {
    it('초·밀리초를 버리고 분 단위로 절삭한다 (BR-07)', () => {
      const d = truncateToMinute('2026-06-04T10:30:45.678Z');
      expect(d.getTime()).toBe(Date.UTC(2026, 5, 4, 10, 30, 0));
    });

    it('toEpochMinute 가 동일 분의 다른 초를 같은 정수로 만든다 (BR-07)', () => {
      const a = toEpochMinute('2026-06-04T10:30:00.000Z');
      const b = toEpochMinute('2026-06-04T10:30:59.999Z');
      expect(a).toBe(b);
    });
  });

  describe('normalizeAllDay', () => {
    it('종일 일정을 [00:00, 익일 00:00) 으로 정규화한다 (BR-07)', () => {
      const { startAt, endAt } = normalizeAllDay('2026-06-04T15:20:00.000Z');
      expect(startAt.getTime()).toBe(Date.UTC(2026, 5, 4, 0, 0, 0));
      expect(endAt.getTime()).toBe(Date.UTC(2026, 5, 5, 0, 0, 0));
    });
  });

  describe('overlaps (BR-07)', () => {
    const a = { startAt: '2026-06-04T10:00:00Z', endAt: '2026-06-04T11:00:00Z' };

    it('겹치는 구간은 true (BR-07)', () => {
      const b = { startAt: '2026-06-04T10:30:00Z', endAt: '2026-06-04T11:30:00Z' };
      expect(overlaps(a, b)).toBe(true);
    });

    it('경계 접촉(A.end == B.start)은 충돌이 아니다 (BR-07/AC-02)', () => {
      const b = { startAt: '2026-06-04T11:00:00Z', endAt: '2026-06-04T12:00:00Z' };
      expect(overlaps(a, b)).toBe(false);
    });

    it('경계 접촉(B.end == A.start)도 충돌이 아니다 (BR-07/AC-02)', () => {
      const b = { startAt: '2026-06-04T09:00:00Z', endAt: '2026-06-04T10:00:00Z' };
      expect(overlaps(a, b)).toBe(false);
    });

    it('완전히 떨어진 구간은 false (BR-07)', () => {
      const b = { startAt: '2026-06-04T13:00:00Z', endAt: '2026-06-04T14:00:00Z' };
      expect(overlaps(a, b)).toBe(false);
    });

    it('초 단위 차이는 분 절삭으로 무시되어 경계 접촉으로 판정한다 (BR-07/AC-02)', () => {
      // A.end=11:00:00, B.start=11:00:30 → 같은 분(11:00)으로 절삭되어 경계 접촉 = 비충돌
      const b = { startAt: '2026-06-04T11:00:30Z', endAt: '2026-06-04T12:00:00Z' };
      expect(overlaps(a, b)).toBe(false);
    });
  });
});

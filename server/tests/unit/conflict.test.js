import { describe, it, expect } from 'vitest';
import conflict from '../../src/domain/conflict.js';

const { detectConflict, findConflicts } = conflict;

const s = (id, startAt, endAt, isAllDay = false) => ({
  scheduleId: id,
  startAt,
  endAt,
  isAllDay,
});

describe('detectConflict (BR-07)', () => {
  it('detectConflict: returns true on overlap (BR-07/AC-01)', () => {
    const a = s('A', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z');
    const b = s('B', '2026-06-04T10:30:00Z', '2026-06-04T11:30:00Z');
    expect(detectConflict(a, b)).toBe(true);
  });

  it('detectConflict: returns false on boundary touch A.end==B.start (BR-07/AC-02)', () => {
    const a = s('A', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z');
    const b = s('B', '2026-06-04T11:00:00Z', '2026-06-04T12:00:00Z');
    expect(detectConflict(a, b)).toBe(false);
  });

  it('detectConflict: returns false on boundary touch B.end==A.start (BR-07/AC-02)', () => {
    const a = s('A', '2026-06-04T11:00:00Z', '2026-06-04T12:00:00Z');
    const b = s('B', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z');
    expect(detectConflict(a, b)).toBe(false);
  });

  it('detectConflict: returns false when fully separated (BR-07)', () => {
    const a = s('A', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z');
    const b = s('B', '2026-06-04T13:00:00Z', '2026-06-04T14:00:00Z');
    expect(detectConflict(a, b)).toBe(false);
  });

  it('detectConflict: full containment overlaps (BR-07/AC-01)', () => {
    const a = s('A', '2026-06-04T10:00:00Z', '2026-06-04T12:00:00Z');
    const b = s('B', '2026-06-04T10:30:00Z', '2026-06-04T11:00:00Z');
    expect(detectConflict(a, b)).toBe(true);
  });

  it('detectConflict: sub-minute difference truncates to boundary touch (BR-07/AC-02)', () => {
    // A.end=11:00:00, B.start=11:00:45 → 둘 다 11:00 분으로 절삭 → 경계 접촉 = 비충돌
    const a = s('A', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z');
    const b = s('B', '2026-06-04T11:00:45Z', '2026-06-04T12:00:00Z');
    expect(detectConflict(a, b)).toBe(false);
  });

  describe('all-day normalization (BR-07 §6.1)', () => {
    it('detectConflict: same-day all-day overlaps timed schedule (BR-07/AC-01)', () => {
      const allDay = s('A', '2026-06-04T00:00:00Z', null, true);
      const timed = s('B', '2026-06-04T09:00:00Z', '2026-06-04T10:00:00Z');
      expect(detectConflict(allDay, timed)).toBe(true);
    });

    it('detectConflict: adjacent-day all-day schedules touch at midnight, no conflict (BR-07/AC-02)', () => {
      const day1 = s('A', '2026-06-04T00:00:00Z', null, true);
      const day2 = s('B', '2026-06-05T00:00:00Z', null, true);
      expect(detectConflict(day1, day2)).toBe(false);
    });

    it('detectConflict: all-day uses startAt date even if time given (BR-07)', () => {
      // isAllDay 면 시각 무시하고 그 날짜의 [00:00, 익일 00:00) 로 정규화
      const allDay = s('A', '2026-06-04T15:30:00Z', '2026-06-04T16:00:00Z', true);
      const lateNight = s('B', '2026-06-04T23:00:00Z', '2026-06-04T23:59:00Z');
      expect(detectConflict(allDay, lateNight)).toBe(true);
    });
  });
});

describe('findConflicts (BR-07/BR-08)', () => {
  const existing = [
    s('S1', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z'),
    s('S2', '2026-06-04T13:00:00Z', '2026-06-04T14:00:00Z'),
  ];

  it('findConflicts: returns overlapping schedules as warnings (BR-07/BR-08)', () => {
    const candidate = s('NEW', '2026-06-04T10:30:00Z', '2026-06-04T13:30:00Z');
    const result = findConflicts(candidate, existing);
    expect(result.map((r) => r.scheduleId)).toEqual(['S1', 'S2']);
  });

  it('findConflicts: returns empty when no overlap (BR-07)', () => {
    const candidate = s('NEW', '2026-06-04T11:00:00Z', '2026-06-04T13:00:00Z');
    expect(findConflicts(candidate, existing)).toEqual([]);
  });

  it('findConflicts: excludes self by scheduleId on update (BR-07/AC-03)', () => {
    // S1 을 10:00~11:30 으로 수정 — 자기 자신은 제외되어 충돌 없음
    const updated = s('S1', '2026-06-04T10:00:00Z', '2026-06-04T11:30:00Z');
    expect(findConflicts(updated, existing)).toEqual([]);
  });

  it('findConflicts: excludes self via explicit selfId (BR-07/AC-03)', () => {
    const candidate = s('TEMP', '2026-06-04T10:00:00Z', '2026-06-04T11:30:00Z');
    const result = findConflicts(candidate, existing, { selfId: 'S1' });
    expect(result).toEqual([]);
  });

  it('findConflicts: handles empty/undefined list (BR-07)', () => {
    const candidate = s('NEW', '2026-06-04T10:00:00Z', '2026-06-04T11:00:00Z');
    expect(findConflicts(candidate, [])).toEqual([]);
    expect(findConflicts(candidate, undefined)).toEqual([]);
  });
});

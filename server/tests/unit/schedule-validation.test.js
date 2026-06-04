import { describe, it, expect } from 'vitest';
import validation from '../../src/domain/schedule-validation.js';

const { validateSchedule } = validation;

describe('validateSchedule (BR-06)', () => {
  it('validateSchedule: accepts startAt < endAt (BR-06)', () => {
    const r = validateSchedule({
      startAt: '2026-06-04T10:00:00Z',
      endAt: '2026-06-04T11:00:00Z',
    });
    expect(r.valid).toBe(true);
  });

  it('validateSchedule: rejects startAt == endAt boundary (BR-06/AC-04)', () => {
    const r = validateSchedule({
      startAt: '2026-06-04T10:00:00Z',
      endAt: '2026-06-04T10:00:00Z',
    });
    expect(r.valid).toBe(false);
    expect(r.code).toBe('VALIDATION_ERROR');
  });

  it('validateSchedule: rejects endAt < startAt reversed (BR-06/AC-04)', () => {
    const r = validateSchedule({
      startAt: '2026-06-04T11:00:00Z',
      endAt: '2026-06-04T10:00:00Z',
    });
    expect(r.valid).toBe(false);
    expect(r.code).toBe('VALIDATION_ERROR');
  });

  it('validateSchedule: same minute different seconds treated as equal → reject (BR-06/AC-04)', () => {
    // 분 단위 비교: 10:00:10 ~ 10:00:50 → 둘 다 10:00 → start>=end → 무효
    const r = validateSchedule({
      startAt: '2026-06-04T10:00:10Z',
      endAt: '2026-06-04T10:00:50Z',
    });
    expect(r.valid).toBe(false);
  });

  it('validateSchedule: rejects missing fields (BR-06)', () => {
    expect(validateSchedule({ startAt: '2026-06-04T10:00:00Z' }).valid).toBe(false);
    expect(validateSchedule({}).valid).toBe(false);
    expect(validateSchedule(null).valid).toBe(false);
  });

  it('validateSchedule: rejects invalid date format (BR-06)', () => {
    const r = validateSchedule({ startAt: 'not-a-date', endAt: '2026-06-04T11:00:00Z' });
    expect(r.valid).toBe(false);
    expect(r.code).toBe('VALIDATION_ERROR');
  });
});

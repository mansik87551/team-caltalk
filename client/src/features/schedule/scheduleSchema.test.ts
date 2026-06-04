import { describe, it, expect } from 'vitest';
import { scheduleFormSchema } from './scheduleSchema';

const valid = {
  title: '회의',
  startAt: '2026-06-05T14:00',
  endAt: '2026-06-05T15:00',
  isAllDay: false,
};

describe('scheduleFormSchema (FE-08 / AC-04)', () => {
  it('정상 입력 통과', () => {
    expect(scheduleFormSchema.safeParse(valid).success).toBe(true);
  });

  it('start == end 거부 (AC-04/EX-03)', () => {
    const r = scheduleFormSchema.safeParse({ ...valid, endAt: '2026-06-05T14:00' });
    expect(r.success).toBe(false);
  });

  it('end < start 거부 (AC-04/EX-03)', () => {
    const r = scheduleFormSchema.safeParse({ ...valid, endAt: '2026-06-05T13:00' });
    expect(r.success).toBe(false);
  });

  it('제목 누락 거부', () => {
    const r = scheduleFormSchema.safeParse({ ...valid, title: '' });
    expect(r.success).toBe(false);
  });
});

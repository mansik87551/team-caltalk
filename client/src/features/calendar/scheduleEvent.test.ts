import { describe, it, expect } from 'vitest';
import { toCalendarEvent } from './scheduleEvent';
import type { Schedule } from '../../api/types';

const base: Schedule = {
  id: 's1',
  teamId: 't1',
  title: '회의',
  startAt: '2026-06-05T05:00:00Z',
  endAt: '2026-06-05T06:00:00Z',
  isAllDay: false,
  createdBy: 'u1',
  createdAt: '2026-06-02T00:00:00Z',
  updatedAt: '2026-06-02T00:00:00Z',
};

describe('toCalendarEvent (FE-07)', () => {
  it('시간 일정은 KST 벽시계로 변환된다(05:00Z→14:00)', () => {
    const e = toCalendarEvent(base);
    expect(e.allDay).toBe(false);
    expect(e.start).toBe('2026-06-05T14:00:00');
    expect(e.end).toBe('2026-06-05T15:00:00');
    expect(e.title).toBe('회의');
  });

  it('종일 일정은 KST 날짜로 매핑되고 allDay=true (end 배타적)', () => {
    const allDay: Schedule = {
      ...base,
      isAllDay: true,
      startAt: '2026-06-05T00:00:00Z',
      endAt: '2026-06-06T00:00:00Z',
    };
    const e = toCalendarEvent(allDay);
    expect(e.allDay).toBe(true);
    expect(e.start).toBe('2026-06-05');
    expect(e.end).toBe('2026-06-06');
  });

  it('원본 schedule 을 extendedProps 로 보존한다(편집 연계)', () => {
    const e = toCalendarEvent(base);
    expect((e.extendedProps as { schedule: Schedule }).schedule.id).toBe('s1');
  });
});

/**
 * Schedule(UTC) → FullCalendar 이벤트 매퍼 (FE-07)
 *
 * KST 표시 변환은 FE-05 lib/datetime 으로만 수행한다(Hard Rule).
 * FullCalendar 는 timeZone='UTC' 로 두고, 여기서 KST 벽시계 문자열로 미리 변환해 전달한다.
 * (명명 시간대 플러그인 없이 런타임 TZ 무관하게 KST 표시를 보장하는 방식)
 */
import type { EventInput } from '@fullcalendar/core';
import { formatInKst, formatKstDate } from '../../lib/datetime';
import type { Schedule } from '../../api/types';

const KST_DATETIME = "yyyy-MM-dd'T'HH:mm:ss";

export function toCalendarEvent(schedule: Schedule): EventInput {
  const common = {
    id: schedule.id,
    title: schedule.title,
    extendedProps: { isAllDay: schedule.isAllDay, schedule },
  };

  if (schedule.isAllDay) {
    // 종일: KST 날짜 기준. FullCalendar all-day end 는 배타적이므로 익일 00:00(KST)→다음 날짜로 매핑.
    return {
      ...common,
      allDay: true,
      start: formatKstDate(schedule.startAt),
      end: formatKstDate(schedule.endAt),
    };
  }

  return {
    ...common,
    allDay: false,
    start: formatInKst(schedule.startAt, KST_DATETIME),
    end: formatInKst(schedule.endAt, KST_DATETIME),
  };
}

export function toCalendarEvents(schedules: Schedule[]): EventInput[] {
  return schedules.map(toCalendarEvent);
}

/**
 * 캘린더 뷰 (FE-07, FR-03 / UC-03/06) — FullCalendar 월/주/일.
 *
 * - 서버 UTC 일정 → KST 표시(이벤트 매퍼). timeZone='UTC' + KST 벽시계 사전 변환.
 * - 날짜 클릭 → selectedDate(uiStore) 갱신 → 채팅(Daily Chat Log) 동기화(UC-06).
 * - 가시 범위(datesSet) 변경 시 from/to 갱신으로 조회 범위 갱신.
 */
import { useState, type ReactElement } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useUiStore } from '../../store/uiStore';
import { useSchedules } from './useSchedules';
import { toCalendarEvents } from './scheduleEvent';
import type { Schedule } from '../../api/types';

interface Props {
  teamId: string | null;
  onSelectSchedule?: (schedule: Schedule) => void;
}

export function CalendarView({ teamId, onSelectSchedule }: Props): ReactElement {
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const { data: schedules = [] } = useSchedules(teamId, range?.from ?? null, range?.to ?? null);
  const events = toCalendarEvents(schedules);

  function handleDatesSet(arg: DatesSetArg) {
    // FullCalendar 가 주는 가시 범위(UTC 모드 naive ISO)를 그대로 from/to 로 사용.
    setRange({ from: arg.startStr, to: arg.endStr });
  }

  function handleDateClick(arg: { dateStr: string }) {
    // 'YYYY-MM-DD'(또는 시각 포함) → 앞 10자리를 targetDate 로.
    setSelectedDate(arg.dateStr.slice(0, 10));
  }

  function handleSelect(arg: DateSelectArg) {
    setSelectedDate(arg.startStr.slice(0, 10));
  }

  function handleEventClick(arg: EventClickArg) {
    const schedule = arg.event.extendedProps.schedule as Schedule | undefined;
    if (schedule && onSelectSchedule) onSelectSchedule(schedule);
  }

  return (
    <div className="h-full" data-testid="calendar-view">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="UTC"
        locale="ko"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{ today: '오늘', month: '월', week: '주', day: '일' }}
        height="auto"
        selectable
        dateClick={handleDateClick}
        select={handleSelect}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        events={events}
      />
    </div>
  );
}

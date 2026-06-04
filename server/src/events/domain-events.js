'use strict';

/**
 * 도메인 이벤트 버스 (BE-07, docs/1 §7)
 *
 * - 인프로세스 EventEmitter 로 도메인 이벤트를 발행한다. BE-11 Notification 이 구독한다.
 * - Service 가 상태 변화의 "사실"을 발행하고, 구독자(알림 등)는 느슨하게 연결된다.
 * - MVP 범위: 동기 인프로세스 전달. 메시지 브로커 도입은 Out-of-Scope.
 */

const { EventEmitter } = require('events');

const EVENTS = Object.freeze({
  SCHEDULE_CREATED: 'ScheduleCreated',
  SCHEDULE_UPDATED: 'ScheduleUpdated',
  SCHEDULE_CONFLICT_DETECTED: 'ScheduleConflictDetected',
  SCHEDULE_CHANGE_REQUESTED: 'ScheduleChangeRequested',
  SCHEDULE_CHANGE_APPLIED: 'ScheduleChangeApplied',
  SCHEDULE_CHANGE_REJECTED: 'ScheduleChangeRejected',
});

// 구독자가 없을 때 'error' 외 이벤트는 조용히 무시되므로 안전하다. 리스너 상한은 넉넉히.
const bus = new EventEmitter();
bus.setMaxListeners(50);

/** 도메인 이벤트 발행 헬퍼. */
function publish(eventName, payload) {
  bus.emit(eventName, payload);
}

module.exports = { bus, EVENTS, publish };

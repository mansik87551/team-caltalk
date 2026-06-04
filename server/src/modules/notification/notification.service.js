'use strict';

/**
 * 알림 서비스 (BE-11, 도메인 7장)
 *
 * - 도메인 이벤트를 구독해 대상 사용자를 결정하고 Notification 을 영속 저장한다.
 *   ConflictDetected→팀장, ScheduleUpdated→팀원 전원, ChangeRequested→팀장,
 *   ChangeApplied/Rejected→요청자(requesterId).
 * - WS 푸시는 io 인스턴스 주입 시 notification:new 로 전달(BE-08 연계). 미연결 사용자는 DB 저장만.
 * - 이벤트 디스패치는 이 Service 에 일원화한다(Controller/Repository 직접 발행 금지).
 *
 * 주의: 이벤트 핸들러는 fire-and-forget 이며 예외를 삼켜 프로세스 안정성을 지킨다(로깅만).
 */

const { bus, EVENTS } = require('../../events/domain-events');
const logger = require('../../utils/logger');
const notificationRepository = require('./notification.repository');
const teamRepository = require('../team/team.repository');
const { ROLE } = require('../../domain/permissions');

// 선택적 WS 인스턴스(BE-08 가 주입). 없으면 DB 저장만 한다(P8 단일 인스턴스).
let io = null;
function setIo(instance) {
  io = instance;
}

// 이벤트 → 알림 type(사람이 읽는 분류) 매핑.
const TYPE_BY_EVENT = {
  [EVENTS.SCHEDULE_CONFLICT_DETECTED]: 'conflict_warning',
  [EVENTS.SCHEDULE_UPDATED]: 'schedule_updated',
  [EVENTS.SCHEDULE_CHANGE_REQUESTED]: 'change_requested',
  [EVENTS.SCHEDULE_CHANGE_APPLIED]: 'change_applied',
  [EVENTS.SCHEDULE_CHANGE_REJECTED]: 'change_rejected',
};

/** 팀의 특정 역할 사용자 id 목록. */
async function userIdsByRole(teamId, role) {
  const members = await teamRepository.findMembersByTeam(teamId);
  return members.filter((m) => m.role === role).map((m) => m.userId);
}

/** 대상 사용자(recipientId) 각각에 알림을 저장하고 WS 푸시한다. */
async function notifyRecipients(recipientIds, { event, payload }) {
  const type = TYPE_BY_EVENT[event] || 'notification';
  const unique = [...new Set(recipientIds)].filter(Boolean);
  for (const recipientId of unique) {
    const notification = await notificationRepository.create({
      recipientId,
      type,
      relatedEvent: event,
      payload,
    });
    if (io) {
      io.to(`user:${recipientId}`).emit('notification:new', notification);
    }
  }
}

/** 이벤트별 수신자 결정 + 알림 생성. */
async function dispatch(event, eventPayload) {
  const { teamId } = eventPayload;
  let recipients = [];

  switch (event) {
    case EVENTS.SCHEDULE_CONFLICT_DETECTED:
    case EVENTS.SCHEDULE_CHANGE_REQUESTED:
      recipients = await userIdsByRole(teamId, ROLE.LEADER);
      break;
    case EVENTS.SCHEDULE_UPDATED:
      recipients = await userIdsByRole(teamId, ROLE.MEMBER);
      break;
    case EVENTS.SCHEDULE_CHANGE_APPLIED:
    case EVENTS.SCHEDULE_CHANGE_REJECTED:
      recipients = eventPayload.requesterId ? [eventPayload.requesterId] : [];
      break;
    default:
      return;
  }

  await notifyRecipients(recipients, { event, payload: eventPayload });
}

let subscribed = false;
/** 이벤트 버스 구독을 1회 등록한다(중복 등록 방지). 핸들러 예외는 삼킨다. */
function initSubscriptions() {
  if (subscribed) return;
  subscribed = true;
  const events = [
    EVENTS.SCHEDULE_CONFLICT_DETECTED,
    EVENTS.SCHEDULE_UPDATED,
    EVENTS.SCHEDULE_CHANGE_REQUESTED,
    EVENTS.SCHEDULE_CHANGE_APPLIED,
    EVENTS.SCHEDULE_CHANGE_REJECTED,
  ];
  for (const event of events) {
    bus.on(event, (payload) => {
      dispatch(event, payload).catch((err) => {
        logger.warn({ err, event }, 'notification dispatch 실패');
      });
    });
  }
}

// 모듈 로드 시 구독 활성화(앱 라우터가 이 모듈을 require 하면 발효).
initSubscriptions();

/** 내 알림 목록(unreadOnly 시 미읽음만). */
async function listNotifications({ userId, unreadOnly }) {
  return notificationRepository.findByRecipient(userId, Boolean(unreadOnly));
}

/** 읽음 처리(소유자 한정). 없으면 404, 타인 소유면 403. */
async function markRead({ userId, notificationId }) {
  const { AppError } = require('../../middlewares/error-handler');
  const existing = await notificationRepository.findById(notificationId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', '알림을 찾을 수 없습니다');
  }
  if (existing.recipientId !== userId) {
    throw new AppError(403, 'FORBIDDEN', '본인의 알림만 처리할 수 있습니다');
  }
  return notificationRepository.markRead(notificationId, userId);
}

module.exports = { setIo, initSubscriptions, dispatch, listNotifications, markRead };

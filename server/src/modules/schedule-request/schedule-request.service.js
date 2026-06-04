'use strict';

/**
 * 일정 변경요청 서비스 (BE-10, FR-08/09 / BR-04/09 / AC-07/08)
 *
 * - 핵심 차별점: 모든 SCR 은 ChatMessage 를 매개로 발생한다. origin_message_id 는 항상 채워진다(NOT NULL).
 *   originMessageId 가 오면 기존 메시지를 연결, 없으면 content 로 메시지를 생성해 그 ID 를 연결한다.
 * - 상태 전이는 domain/change-request-state.canTransition 으로 가드(BR-09). 종결 상태 재전이는 409(AC-08).
 * - Applied 시 대상 Schedule 수정 + SCR 상태 전이를 단일 트랜잭션으로 원자 처리(AC-07).
 * - ScheduleChangeRequested/Applied/Rejected 이벤트를 발행한다(BE-11 연계).
 */

const { withTransaction } = require('../../db/pool');
const { AppError } = require('../../middlewares/error-handler');
const { normalizeAllDay } = require('../../utils/time');
const { canTransition, STATUS } = require('../../domain/change-request-state');
const { validateSchedule } = require('../../domain/schedule-validation');
const { publish, EVENTS } = require('../../events/domain-events');
const scrRepository = require('./schedule-request.repository');
const scheduleRepository = require('../schedule/schedule.repository');
const chatRepository = require('../chat/chat.repository');
const chatService = require('../chat/chat.service');

function effectiveInterval({ startAt, endAt, isAllDay }) {
  if (isAllDay) return normalizeAllDay(startAt);
  return { startAt, endAt };
}

/**
 * 변경요청 생성. 대상 일정/근거 메시지를 검증하고 origin_message_id 를 항상 연결한다.
 * @returns {Promise<ScheduleChangeRequest>}
 */
async function createRequest({ teamId, requesterId, scheduleId, requestContent, originMessageId, content }) {
  // 대상 Schedule 이 해당 팀에 존재해야 한다.
  const schedule = await scheduleRepository.findById(scheduleId);
  if (!schedule || schedule.teamId !== teamId) {
    throw new AppError(404, 'NOT_FOUND', '대상 일정을 찾을 수 없습니다');
  }

  // origin_message_id 확정: 기존 메시지 연결 또는 새 메시지 생성(핵심 차별점, 항상 채워짐).
  let resolvedOriginMessageId = originMessageId;
  if (resolvedOriginMessageId) {
    const message = await chatRepository.findById(resolvedOriginMessageId);
    if (!message || message.teamId !== teamId) {
      throw new AppError(400, 'INVALID_ORIGIN_MESSAGE', '근거 메시지를 찾을 수 없거나 다른 팀의 메시지입니다');
    }
  } else {
    // content 로 채팅 메시지를 생성하고 그 ID 를 근거로 연결한다(브로드캐스트 이벤트도 함께 발생).
    const created = await chatService.createMessage({
      teamId,
      senderId: requesterId,
      content,
    });
    resolvedOriginMessageId = created.id;
  }

  const scr = await scrRepository.create({
    teamId,
    scheduleId,
    requesterId,
    requestContent,
    originMessageId: resolvedOriginMessageId,
  });

  publish(EVENTS.SCHEDULE_CHANGE_REQUESTED, {
    requestId: scr.id,
    teamId,
    scheduleId,
    requesterId,
  });

  return scr;
}

/** 변경요청 목록(status 필터, ix_scr_team_status). */
async function listRequests({ teamId, status }) {
  return scrRepository.findByTeam(teamId, status || null);
}

/**
 * 변경요청 처리(applied/rejected). 종결 상태 재전이는 409(AC-08).
 * applied 시 대상 Schedule 을 수정하고 SCR 상태를 전이(트랜잭션, AC-07).
 * @returns {Promise<ScheduleChangeRequest>}
 */
async function processRequest({ teamId, requestId, action, scheduleUpdate, rejectReason, processedBy }) {
  const scr = await scrRepository.findById(requestId);
  if (!scr || scr.teamId !== teamId) {
    throw new AppError(404, 'NOT_FOUND', '변경요청을 찾을 수 없습니다');
  }

  // 상태 전이 가드(BR-09). 종결(applied/rejected) 상태에서의 재전이는 409.
  if (!canTransition(scr.status, action)) {
    throw new AppError(409, 'INVALID_STATE_TRANSITION', `'${scr.status}' 상태에서 '${action}' 로 전이할 수 없습니다`);
  }

  if (action === STATUS.REJECTED) {
    const updated = await scrRepository.updateStatus(requestId, {
      status: STATUS.REJECTED,
      processedBy,
      rejectReason: rejectReason || null,
    });
    publish(EVENTS.SCHEDULE_CHANGE_REJECTED, { requestId, teamId, rejectReason: rejectReason || null });
    return updated;
  }

  // action === applied: 대상 Schedule 수정 + SCR 전이를 원자 처리.
  const existing = await scheduleRepository.findById(scr.scheduleId);
  if (!existing || existing.teamId !== teamId) {
    throw new AppError(404, 'NOT_FOUND', '대상 일정을 찾을 수 없습니다');
  }

  const merged = {
    title: scheduleUpdate.title !== undefined ? scheduleUpdate.title : existing.title,
    startAt: scheduleUpdate.startAt !== undefined ? scheduleUpdate.startAt : existing.startAt,
    endAt: scheduleUpdate.endAt !== undefined ? scheduleUpdate.endAt : existing.endAt,
    isAllDay: scheduleUpdate.isAllDay !== undefined ? scheduleUpdate.isAllDay : existing.isAllDay,
  };
  const eff = effectiveInterval(merged);
  const validity = validateSchedule(eff);
  if (!validity.valid) {
    throw new AppError(400, validity.code, validity.message);
  }

  const updated = await withTransaction(async (exec) => {
    await scheduleRepository.update(
      scr.scheduleId,
      { title: merged.title, startAt: eff.startAt, endAt: eff.endAt, isAllDay: merged.isAllDay },
      exec
    );
    return scrRepository.updateStatus(requestId, { status: STATUS.APPLIED, processedBy }, exec);
  });

  publish(EVENTS.SCHEDULE_UPDATED, { scheduleId: scr.scheduleId, teamId });
  publish(EVENTS.SCHEDULE_CHANGE_APPLIED, { requestId, teamId, scheduleId: scr.scheduleId });

  return updated;
}

module.exports = { createRequest, listRequests, processRequest };

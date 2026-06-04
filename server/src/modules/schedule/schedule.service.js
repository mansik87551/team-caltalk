'use strict';

/**
 * 일정 서비스 (BE-07, FR-03~06 / BR-06/07/08)
 *
 * - 권한(팀장 한정 CUD)은 미들웨어가 강제하므로 여기서는 비즈니스 규칙에 집중한다.
 * - 종일 일정은 [당일 00:00 UTC, 다음날 00:00 UTC) 로 정규화하여 저장·판정한다(BR-07).
 * - 유효성(BR-06)은 domain/schedule-validation 으로 검사(앱 검증) + DB CHECK 로 이중 보장.
 * - 충돌(BR-07)은 domain/conflict.findConflicts 로 판정하되, 충돌해도 저장한다(BR-08).
 * - ScheduleCreated/Updated/ConflictDetected 도메인 이벤트를 발행한다(BE-11 연계).
 */

const { AppError } = require('../../middlewares/error-handler');
const { normalizeAllDay } = require('../../utils/time');
const { validateSchedule } = require('../../domain/schedule-validation');
const { findConflicts } = require('../../domain/conflict');
const { publish, EVENTS } = require('../../events/domain-events');
const scheduleRepository = require('./schedule.repository');

/** 충돌 경고 항목으로 직렬화(swagger ConflictInfo). */
function toConflictInfo(s) {
  return { scheduleId: s.id, title: s.title, startAt: s.startAt, endAt: s.endAt };
}

/**
 * isAllDay 면 [00:00, 익일 00:00) 로 정규화한 startAt/endAt 을 반환한다. 아니면 입력 그대로.
 * 정규화 결과를 저장하므로 DB 의 raw 시각과 충돌 판정 기준이 일치한다.
 */
function effectiveInterval({ startAt, endAt, isAllDay }) {
  if (isAllDay) return normalizeAllDay(startAt);
  return { startAt, endAt };
}

/** 기간 범위 조회(멤버 조회). */
async function list({ teamId, from, to }) {
  return scheduleRepository.findByTeamInRange(teamId, from, to);
}

/**
 * 일정 등록. 유효성 위반 400(BR-06/AC-04). 충돌해도 저장 후 conflicts[] 반환(BR-08).
 * @returns {Promise<{ schedule: object, conflicts: Array }>}
 */
async function create({ teamId, createdBy, title, startAt, endAt, isAllDay = false }) {
  const eff = effectiveInterval({ startAt, endAt, isAllDay });

  const validity = validateSchedule(eff);
  if (!validity.valid) {
    throw new AppError(400, validity.code, validity.message);
  }

  const candidates = await scheduleRepository.findConflictCandidates(
    teamId,
    eff.startAt,
    eff.endAt,
    null
  );
  const conflicts = findConflicts({ startAt: eff.startAt, endAt: eff.endAt }, candidates);

  const schedule = await scheduleRepository.create({
    teamId,
    title,
    startAt: eff.startAt,
    endAt: eff.endAt,
    isAllDay,
    createdBy,
  });

  publish(EVENTS.SCHEDULE_CREATED, { scheduleId: schedule.id, teamId, createdBy });
  if (conflicts.length > 0) {
    publish(EVENTS.SCHEDULE_CONFLICT_DETECTED, {
      scheduleId: schedule.id,
      teamId,
      conflictIds: conflicts.map((c) => c.id),
    });
  }

  return { schedule, conflicts: conflicts.map(toConflictInfo) };
}

/**
 * 일정 수정. 부분 필드를 기존 값과 병합 후 정규화·검증·충돌 판정. 자기 자신 제외(AC-03).
 * 대상이 없거나 다른 팀 소속이면 404. 충돌해도 저장(BR-08).
 */
async function update({ teamId, scheduleId, patch }) {
  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing || existing.teamId !== teamId) {
    throw new AppError(404, 'NOT_FOUND', '일정을 찾을 수 없습니다');
  }

  const merged = {
    title: patch.title !== undefined ? patch.title : existing.title,
    startAt: patch.startAt !== undefined ? patch.startAt : existing.startAt,
    endAt: patch.endAt !== undefined ? patch.endAt : existing.endAt,
    isAllDay: patch.isAllDay !== undefined ? patch.isAllDay : existing.isAllDay,
  };
  const eff = effectiveInterval(merged);

  const validity = validateSchedule(eff);
  if (!validity.valid) {
    throw new AppError(400, validity.code, validity.message);
  }

  const candidates = await scheduleRepository.findConflictCandidates(
    teamId,
    eff.startAt,
    eff.endAt,
    scheduleId
  );
  const conflicts = findConflicts({ startAt: eff.startAt, endAt: eff.endAt }, candidates, {
    selfId: scheduleId,
  });

  const schedule = await scheduleRepository.update(scheduleId, {
    title: merged.title,
    startAt: eff.startAt,
    endAt: eff.endAt,
    isAllDay: merged.isAllDay,
  });

  publish(EVENTS.SCHEDULE_UPDATED, { scheduleId: schedule.id, teamId });
  if (conflicts.length > 0) {
    publish(EVENTS.SCHEDULE_CONFLICT_DETECTED, {
      scheduleId: schedule.id,
      teamId,
      conflictIds: conflicts.map((c) => c.id),
    });
  }

  return { schedule, conflicts: conflicts.map(toConflictInfo) };
}

/** 일정 삭제. 대상이 없거나 다른 팀이면 404. */
async function remove({ teamId, scheduleId }) {
  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing || existing.teamId !== teamId) {
    throw new AppError(404, 'NOT_FOUND', '일정을 찾을 수 없습니다');
  }
  await scheduleRepository.remove(scheduleId);
}

module.exports = { list, create, update, remove };

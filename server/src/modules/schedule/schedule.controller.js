'use strict';

/**
 * 일정 컨트롤러 (BE-07)
 *
 * - req/res 파싱·응답 직렬화만 담당(비즈니스 로직 금지). 검증은 라우트 validate 미들웨어가 수행.
 * - GET 은 Schedule[] 반환, POST/PUT 은 ScheduleResponse({ schedule, conflicts }), DELETE 는 204.
 */

const scheduleService = require('./schedule.service');

async function list(req, res) {
  const schedules = await scheduleService.list({
    teamId: req.params.teamId,
    from: req.query.from,
    to: req.query.to,
  });
  res.status(200).json(schedules);
}

async function create(req, res) {
  const result = await scheduleService.create({
    teamId: req.params.teamId,
    createdBy: req.user.userId,
    title: req.body.title,
    startAt: req.body.startAt,
    endAt: req.body.endAt,
    isAllDay: req.body.isAllDay,
  });
  res.status(201).json(result);
}

async function update(req, res) {
  const result = await scheduleService.update({
    teamId: req.params.teamId,
    scheduleId: req.params.scheduleId,
    patch: req.body,
  });
  res.status(200).json(result);
}

async function remove(req, res) {
  await scheduleService.remove({
    teamId: req.params.teamId,
    scheduleId: req.params.scheduleId,
  });
  res.status(204).send();
}

module.exports = { list, create, update, remove };

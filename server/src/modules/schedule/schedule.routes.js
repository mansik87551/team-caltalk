'use strict';

/**
 * 일정 라우터 (BE-07) — /api/teams/:teamId/schedules 하위에 마운트(mergeParams).
 *
 * 체인: authenticate → validate(params) → requireMembership → [requirePermission] → validate(body) → controller
 * - 조회는 멤버 한정(requireMembership, BR-02). CUD 는 팀장 한정(requirePermission, BR-03/AC-05) — Service 진입 전 차단.
 */

const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const { authenticate } = require('../../middlewares/authenticate');
const { requireMembership, requirePermission } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const { ACTION } = require('../../domain/permissions');
const scheduleController = require('./schedule.controller');
const {
  createScheduleSchema,
  updateScheduleSchema,
  teamIdParamSchema,
  scheduleParamsSchema,
  rangeQuerySchema,
} = require('./schedule.schema');

const router = express.Router({ mergeParams: true });

// 기간 범위 조회(멤버 한정)
router.get(
  '/',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  validate(rangeQuerySchema, 'query'),
  asyncHandler(scheduleController.list)
);

// 일정 등록(팀장 한정)
router.post(
  '/',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  requirePermission(ACTION.SCHEDULE_CREATE),
  validate(createScheduleSchema),
  asyncHandler(scheduleController.create)
);

// 일정 수정(팀장 한정)
router.put(
  '/:scheduleId',
  authenticate,
  validate(scheduleParamsSchema, 'params'),
  requireMembership,
  requirePermission(ACTION.SCHEDULE_UPDATE),
  validate(updateScheduleSchema),
  asyncHandler(scheduleController.update)
);

// 일정 삭제(팀장 한정)
router.delete(
  '/:scheduleId',
  authenticate,
  validate(scheduleParamsSchema, 'params'),
  requireMembership,
  requirePermission(ACTION.SCHEDULE_DELETE),
  asyncHandler(scheduleController.remove)
);

module.exports = router;

'use strict';

/**
 * 변경요청 라우터 (BE-10) — /api/teams/:teamId/schedule-change-requests 하위 마운트(mergeParams).
 *
 * - GET/POST: 팀 멤버 모두(생성은 팀원·팀장 모두 가능, BR-04). requirePermission(CHANGE_REQUEST_CREATE).
 * - PATCH(처리): 팀장만(requirePermission(CHANGE_REQUEST_PROCESS), AC-08).
 * 체인: authenticate → validate(params) → requireMembership → [requirePermission] → validate(body|query) → controller
 */

const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const { authenticate } = require('../../middlewares/authenticate');
const { requireMembership, requirePermission } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const { ACTION } = require('../../domain/permissions');
const scrController = require('./schedule-request.controller');
const {
  createRequestSchema,
  processRequestSchema,
  teamIdParamSchema,
  requestParamsSchema,
  statusQuerySchema,
} = require('./schedule-request.schema');

const router = express.Router({ mergeParams: true });

// 목록 조회(멤버 한정)
router.get(
  '/',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  validate(statusQuerySchema, 'query'),
  asyncHandler(scrController.list)
);

// 생성(팀원·팀장 모두)
router.post(
  '/',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  requirePermission(ACTION.CHANGE_REQUEST_CREATE),
  validate(createRequestSchema),
  asyncHandler(scrController.create)
);

// 처리(팀장만)
router.patch(
  '/:requestId',
  authenticate,
  validate(requestParamsSchema, 'params'),
  requireMembership,
  requirePermission(ACTION.CHANGE_REQUEST_PROCESS),
  validate(processRequestSchema),
  asyncHandler(scrController.process)
);

module.exports = router;

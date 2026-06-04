'use strict';

/**
 * 채팅 라우터 (BE-09) — /api/teams/:teamId/chat 하위에 마운트(mergeParams).
 *
 * 체인: authenticate → validate(params) → requireMembership → validate(body|query) → controller
 * - 작성/조회 모두 팀 멤버 한정(requireMembership, BR-02/AC-06). 채팅은 역할 무관(팀장·팀원 모두 가능).
 */

const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const { authenticate } = require('../../middlewares/authenticate');
const { requireMembership } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const chatController = require('./chat.controller');
const { createMessageSchema, dateQuerySchema, teamIdParamSchema } = require('./chat.schema');

const router = express.Router({ mergeParams: true });

// Daily Chat Log 조회(target_date 기준)
router.get(
  '/',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  validate(dateQuerySchema, 'query'),
  asyncHandler(chatController.list)
);

// 메시지 작성
router.post(
  '/',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  validate(createMessageSchema),
  asyncHandler(chatController.create)
);

module.exports = router;

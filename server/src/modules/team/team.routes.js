'use strict';

/**
 * 팀 라우터 (BE-06) — /api/teams 하위에 마운트된다.
 *
 * 모든 라우트는 인증 필수(authenticate). 팀 리소스 접근은 requireMembership 으로 격리(BR-02).
 * 체인: authenticate → validate → [requireMembership] → controller
 */

const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const { authenticate } = require('../../middlewares/authenticate');
const { requireMembership } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const teamController = require('./team.controller');
const { createTeamSchema, teamIdParamSchema } = require('./team.schema');

const router = express.Router();

// 내 소속 팀 목록
router.get('/', authenticate, asyncHandler(teamController.listMyTeams));

// 팀 생성(생성자 team_leader 자동 부여)
router.post('/', authenticate, validate(createTeamSchema), asyncHandler(teamController.createTeam));

// 팀 가입(team_member) — 멤버십 없이 호출하므로 requireMembership 미적용
router.post(
  '/:teamId/members',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  asyncHandler(teamController.joinTeam)
);

// 팀 멤버 목록(멤버 한정, BR-02)
router.get(
  '/:teamId/members',
  authenticate,
  validate(teamIdParamSchema, 'params'),
  requireMembership,
  asyncHandler(teamController.listMembers)
);

module.exports = router;

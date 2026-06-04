'use strict';

/**
 * 팀 컨트롤러 (BE-06)
 *
 * - req/res 파싱·응답 직렬화만 담당한다(비즈니스 로직 금지, docs/4 §2.1).
 * - 입력 검증은 라우트의 validate 미들웨어가 수행한다.
 */

const teamService = require('./team.service');

// POST /api/teams — 팀 생성(생성자 team_leader 자동), 201 TeamWithRole
async function createTeam(req, res) {
  const team = await teamService.createTeam({ name: req.body.name, ownerId: req.user.userId });
  res.status(201).json(team);
}

// POST /api/teams/:teamId/members — 가입(team_member), 201 Membership
async function joinTeam(req, res) {
  const membership = await teamService.joinTeam({
    teamId: req.params.teamId,
    userId: req.user.userId,
  });
  res.status(201).json(membership);
}

// GET /api/teams/:teamId/members — 멤버 목록(멤버 한정), 200 Membership[]
async function listMembers(req, res) {
  const members = await teamService.listMembers(req.params.teamId);
  res.status(200).json(members);
}

// GET /api/teams — 내 소속 팀 목록, 200 TeamWithRole[]
async function listMyTeams(req, res) {
  const teams = await teamService.listMyTeams(req.user.userId);
  res.status(200).json(teams);
}

module.exports = { createTeam, joinTeam, listMembers, listMyTeams };

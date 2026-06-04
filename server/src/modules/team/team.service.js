'use strict';

/**
 * 팀·멤버십 서비스 (BE-06, FR-02 / BR-02 / BR-10)
 *
 * - 팀 생성 + 생성자 team_leader 멤버십 부여를 단일 트랜잭션으로 처리(원자성, OI-2).
 * - 가입은 team_member 역할 부여, (user_id, team_id) UNIQUE 위반 시 409 ALREADY_MEMBER.
 * - 역할 부여 로직은 Service 에만 둔다(Repository 는 SQL 실행만, docs/4 §2.1).
 */

const { withTransaction } = require('../../db/pool');
const { AppError } = require('../../middlewares/error-handler');
const { ROLE } = require('../../domain/permissions');
const teamRepository = require('./team.repository');

const PG_UNIQUE_VIOLATION = '23505';

/**
 * 팀 생성: 팀 + 생성자 team_leader 멤버십을 트랜잭션으로 원자 생성(OI-2).
 * @param {{ name: string, ownerId: string }} input
 * @returns {Promise<{id,name,createdAt,updatedAt,role}>} TeamWithRole
 */
async function createTeam({ name, ownerId }) {
  return withTransaction(async (exec) => {
    const team = await teamRepository.createTeam(name, exec);
    await teamRepository.addMember(
      { userId: ownerId, teamId: team.id, role: ROLE.LEADER },
      exec
    );
    return { ...team, role: ROLE.LEADER };
  });
}

/**
 * 팀 가입: team_member 역할로 멤버십 생성. 팀 미존재 404, 중복 가입 409.
 * @param {{ teamId: string, userId: string }} input
 * @returns {Promise<Membership>}
 */
async function joinTeam({ teamId, userId }) {
  const team = await teamRepository.findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'TEAM_NOT_FOUND', '존재하지 않는 팀입니다');
  }
  try {
    return await teamRepository.addMember({ userId, teamId, role: ROLE.MEMBER });
  } catch (err) {
    if (err && err.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, 'ALREADY_MEMBER', '이미 해당 팀의 멤버입니다');
    }
    throw err;
  }
}

/** 팀 멤버 목록 조회(멤버 한정 접근은 미들웨어가 강제, BR-02). */
async function listMembers(teamId) {
  return teamRepository.findMembersByTeam(teamId);
}

/** 사용자가 속한 팀 목록(역할 포함). */
async function listMyTeams(userId) {
  return teamRepository.findTeamsByUser(userId);
}

module.exports = { createTeam, joinTeam, listMembers, listMyTeams };

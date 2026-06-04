'use strict';

/**
 * 팀·멤버십 리포지토리 (BE-06)
 *
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule).
 * - snake_case 컬럼을 camelCase 로 매핑한다(docs/4 §3.1).
 * - 각 함수는 선택적 exec(트랜잭션 바운드 query)를 받는다. 미지정 시 풀 query 사용.
 *   Service 가 팀 생성+리더 멤버십을 단일 트랜잭션으로 묶기 위함(OI-2).
 */

const { query } = require('../../db/pool');

function mapTeam(row) {
  if (!row) return null;
  return {
    id: row.team_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMembership(row) {
  if (!row) return null;
  return {
    id: row.membership_id,
    userId: row.user_id,
    teamId: row.team_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

/** 팀 생성. @returns {Promise<{id,name,createdAt,updatedAt}>} */
async function createTeam(name, exec = query) {
  const { rows } = await exec(
    `INSERT INTO teams (name) VALUES ($1)
     RETURNING team_id, name, created_at, updated_at`,
    [name]
  );
  return mapTeam(rows[0]);
}

/**
 * 멤버십 추가. (user_id, team_id) UNIQUE 위반은 pg 23505 로 전파(Service 가 409 매핑, BR-10).
 * @returns {Promise<{id,userId,teamId,role,joinedAt}>}
 */
async function addMember({ userId, teamId, role }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO memberships (user_id, team_id, role) VALUES ($1, $2, $3)
     RETURNING membership_id, user_id, team_id, role, joined_at`,
    [userId, teamId, role]
  );
  return mapMembership(rows[0]);
}

/** teamId 로 팀 조회(가입 시 존재 확인). 없으면 null. */
async function findTeamById(teamId, exec = query) {
  const { rows } = await exec(
    `SELECT team_id, name, created_at, updated_at FROM teams WHERE team_id = $1`,
    [teamId]
  );
  return mapTeam(rows[0]);
}

/** 팀 멤버 목록(ix_memberships_team 활용). @returns {Promise<Array<Membership>>} */
async function findMembersByTeam(teamId, exec = query) {
  const { rows } = await exec(
    `SELECT membership_id, user_id, team_id, role, joined_at
       FROM memberships
      WHERE team_id = $1
      ORDER BY joined_at ASC`,
    [teamId]
  );
  return rows.map(mapMembership);
}

/**
 * 사용자가 속한 팀 목록을 역할과 함께 반환(TeamWithRole). 다중 팀 소속 지원(BR-10).
 * @returns {Promise<Array<{id,name,createdAt,updatedAt,role}>>}
 */
async function findTeamsByUser(userId, exec = query) {
  const { rows } = await exec(
    `SELECT t.team_id, t.name, t.created_at, t.updated_at, m.role
       FROM memberships m
       JOIN teams t ON t.team_id = m.team_id
      WHERE m.user_id = $1
      ORDER BY m.joined_at ASC`,
    [userId]
  );
  return rows.map((row) => ({ ...mapTeam(row), role: row.role }));
}

module.exports = {
  createTeam,
  addMember,
  findTeamById,
  findMembersByTeam,
  findTeamsByUser,
  mapTeam,
  mapMembership,
};

'use strict';

/**
 * 멤버십 리포지토리 (BE-05)
 *
 * - 권한 미들웨어(authorize)와 팀 관리(BE-06)가 공유하는 멤버십 조회 계층.
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule).
 * - (user_id, team_id) UNIQUE 인덱스(uq_memberships_user_team)를 활용한다.
 */

const { query } = require('../../db/pool');

function mapRow(row) {
  if (!row) return null;
  return {
    membershipId: row.membership_id,
    userId: row.user_id,
    teamId: row.team_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

/**
 * 특정 사용자의 특정 팀 멤버십을 조회한다(타팀 격리·역할 판정용). 없으면 null.
 * @param {string} userId
 * @param {string} teamId
 * @returns {Promise<{membershipId, userId, teamId, role, joinedAt}|null>}
 */
async function findByUserAndTeam(userId, teamId) {
  const { rows } = await query(
    `SELECT membership_id, user_id, team_id, role, joined_at
       FROM memberships
      WHERE user_id = $1 AND team_id = $2`,
    [userId, teamId]
  );
  return mapRow(rows[0]);
}

module.exports = { findByUserAndTeam, mapRow };

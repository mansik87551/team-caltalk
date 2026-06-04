'use strict';

/**
 * 인증 리포지토리 (BE-04)
 *
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule, 문자열 연결 금지).
 * - DB 의 snake_case 컬럼을 내부/API 용 camelCase 로 매핑한다(docs/4 §3.1).
 * - findByEmail 은 비밀번호 검증을 위해 passwordHash 를 포함한다(내부 전용, 외부 노출 금지).
 */

const { query } = require('../../db/pool');

/**
 * DB row(snake_case) → 내부 사용자 객체(camelCase). passwordHash 포함(내부 전용).
 * 응답 직렬화 시에는 Service 의 toPublicUser 로 passwordHash 를 제거한다.
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.user_id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 이메일로 사용자를 조회한다(로그인 검증용). 없으면 null.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  const { rows } = await query(
    `SELECT user_id, email, display_name, password_hash, created_at, updated_at
       FROM users
      WHERE email = $1`,
    [email]
  );
  return mapRow(rows[0]);
}

/**
 * 사용자를 생성한다. 이메일 UNIQUE 위반은 pg 에러 코드 23505 로 전파된다(Service 가 409 매핑).
 * @param {{ email: string, displayName: string, passwordHash: string }} input
 * @returns {Promise<object>} 생성된 사용자(passwordHash 포함, 내부 전용)
 */
async function createUser({ email, displayName, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING user_id, email, display_name, password_hash, created_at, updated_at`,
    [email, displayName, passwordHash]
  );
  return mapRow(rows[0]);
}

module.exports = { findByEmail, createUser, mapRow };

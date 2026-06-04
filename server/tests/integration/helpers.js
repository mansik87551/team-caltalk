'use strict';

/**
 * 통합 테스트 공용 헬퍼 (BE-12)
 *
 * - 실제 인증 API(signup)로 토큰을 발급받아 종단(end-to-end) HTTP 흐름을 검증한다.
 * - 각 스위트는 고유 prefix 로 격리하고, cleanup() 으로 생성 데이터를 정리한다(teams CASCADE).
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const pool = require('../../src/db/pool');

const app = createApp();

let seq = 0;
function uniqueEmail(prefix) {
  seq += 1;
  return `${prefix}-${seq}@example.com`;
}

/** 회원가입으로 사용자 생성 + 토큰 발급. @returns {Promise<{id, email, token}>} */
async function signup(prefix, displayName = '테스터', password = 'P@ssw0rd!') {
  const email = uniqueEmail(prefix);
  const res = await request(app).post('/api/auth/signup').send({ email, displayName, password });
  if (res.status !== 201) throw new Error(`signup 실패: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id, email, token: res.body.token };
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** 팀 생성(생성자=team_leader). @returns {Promise<string>} teamId */
async function createTeam(token, name) {
  const res = await request(app).post('/api/teams').set(bearer(token)).send({ name });
  if (res.status !== 201) throw new Error(`createTeam 실패: ${res.status}`);
  return res.body.id;
}

/** 팀 가입(team_member). */
async function joinTeam(token, teamId) {
  return request(app).post(`/api/teams/${teamId}/members`).set(bearer(token));
}

/** 일정 등록. @returns supertest response (body: { schedule, conflicts }) */
function createSchedule(token, teamId, body) {
  return request(app).post(`/api/teams/${teamId}/schedules`).set(bearer(token)).send(body);
}

/** 채팅 작성. @returns supertest response (body: ChatMessage) */
function postChat(token, teamId, body) {
  return request(app).post(`/api/teams/${teamId}/chat`).set(bearer(token)).send(body);
}

/** prefix 로 생성된 teams/users 정리(teams CASCADE 로 하위 데이터 동반 삭제). */
async function cleanup(prefix) {
  await pool.query(`DELETE FROM teams WHERE name LIKE $1`, [`${prefix}%`]);
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`${prefix}-%@example.com`]);
}

module.exports = {
  app,
  request,
  pool,
  bearer,
  signup,
  createTeam,
  joinTeam,
  createSchedule,
  postChat,
  cleanup,
};

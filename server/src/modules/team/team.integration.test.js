import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import appModule from '../../app.js';
import poolModule from '../../db/pool.js';
import authService from '../auth/auth.service.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;

const app = createApp();
const PREFIX = `be06-test-${Date.now()}`;
const NONEXISTENT_TEAM = '00000000-0000-0000-0000-000000000000';

let leader;
let joiner;
let outsider;
let leaderToken;
let joinerToken;
let outsiderToken;
let teamId;

async function createUser(suffix) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING user_id`,
    [`${PREFIX}-${suffix}@example.com`, `tester-${suffix}`, '$2b$10$dummystoredhashvalueonly']
  );
  return rows[0].user_id;
}

beforeAll(async () => {
  leader = await createUser('leader');
  joiner = await createUser('joiner');
  outsider = await createUser('outsider');
  leaderToken = authService.signToken({ id: leader, email: `${PREFIX}-leader@example.com` });
  joinerToken = authService.signToken({ id: joiner, email: `${PREFIX}-joiner@example.com` });
  outsiderToken = authService.signToken({ id: outsider, email: `${PREFIX}-outsider@example.com` });
});

afterAll(async () => {
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]); // memberships CASCADE
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]);
  await closePool();
});

describe('POST /api/teams — 팀 생성 (BE-06 / FR-02 / OI-2)', () => {
  it('인증 사용자가 팀 생성 시 201 + 생성자 team_leader 자동 부여', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: `${PREFIX}-teamA` });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: `${PREFIX}-teamA`, role: 'team_leader' });
    expect(res.body.id).toBeTruthy();
    teamId = res.body.id;
  });

  it('생성과 동시에 리더 멤버십이 트랜잭션으로 함께 저장된다 (OI-2)', async () => {
    const { rows } = await query(
      `SELECT role FROM memberships WHERE team_id = $1 AND user_id = $2`,
      [teamId, leader]
    );
    expect(rows[0].role).toBe('team_leader');
  });

  it('무토큰 시 401', async () => {
    const res = await request(app).post('/api/teams').send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('팀명 누락/빈값 시 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/teams/:teamId/members — 가입 (BE-06 / BR-10)', () => {
  it('팀원 가입 시 201 + team_member 역할', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${joinerToken}`);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ teamId, userId: joiner, role: 'team_member' });
  });

  it('중복 가입 시 409 ALREADY_MEMBER (BR-10)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${joinerToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('존재하지 않는 팀 가입 시 404 TEAM_NOT_FOUND', async () => {
    const res = await request(app)
      .post(`/api/teams/${NONEXISTENT_TEAM}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TEAM_NOT_FOUND');
  });

  it('teamId 형식 위반 시 400', async () => {
    const res = await request(app)
      .post(`/api/teams/not-a-uuid/members`)
      .set('Authorization', `Bearer ${joinerToken}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/teams/:teamId/members — 멤버 한정 조회 (BE-06 / BR-02)', () => {
  it('멤버는 200 + 멤버 목록(리더+팀원)', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${joinerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const roles = res.body.map((m) => m.role).sort();
    expect(roles).toEqual(['team_leader', 'team_member']);
  });

  it('비멤버(outsider)는 403 (타팀 격리, BR-02)', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/teams — 다중 팀 소속·각 팀 단일 역할 (BE-06 / BR-10)', () => {
  it('joiner 가 새 팀을 만들면 team1=member, team2=leader 로 2개 팀이 조회된다', async () => {
    await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ name: `${PREFIX}-teamB` });

    const res = await request(app).get('/api/teams').set('Authorization', `Bearer ${joinerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    const byName = Object.fromEntries(res.body.map((t) => [t.name, t.role]));
    expect(byName[`${PREFIX}-teamA`]).toBe('team_member');
    expect(byName[`${PREFIX}-teamB`]).toBe('team_leader');
  });
});

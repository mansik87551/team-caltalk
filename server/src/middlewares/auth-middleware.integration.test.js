import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

import { authenticate } from './authenticate.js';
import { requireMembership, requireRole, requirePermission } from './authorize.js';
import { errorHandler } from './error-handler.js';
import permissions from '../domain/permissions.js';
import authService from '../modules/auth/auth.service.js';
import appModule from '../app.js';
import poolModule from '../db/pool.js';

const { ROLE, ACTION } = permissions;
const { createApp } = appModule;
const { query, closePool } = poolModule;

const PREFIX = `be05-test-${Date.now()}`;
const realApp = createApp(); // /api/auth/me 라우트 검증용

// 미들웨어 체인 검증용 최소 앱
const guardApp = express();
guardApp.use(express.json());
guardApp.get(
  '/api/teams/:teamId/can-create',
  authenticate,
  requireMembership,
  requirePermission(ACTION.SCHEDULE_CREATE),
  (req, res) => res.json({ ok: true, role: req.membership.role })
);
guardApp.get(
  '/api/teams/:teamId/leader-only',
  authenticate,
  requireMembership,
  requireRole(ROLE.LEADER),
  (req, res) => res.json({ ok: true })
);
guardApp.get('/api/teams/:teamId/any-member', authenticate, requireMembership, (req, res) =>
  res.json({ teamId: req.params.teamId, role: req.membership.role })
);
guardApp.use(errorHandler);

let teamA;
let teamB;
let leader; // teamA 팀장
let member; // teamA 팀원
let outsider; // 어느 팀에도 속하지 않음
let leaderToken;
let memberToken;
let outsiderToken;

async function createUser(suffix) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING user_id`,
    [`${PREFIX}-${suffix}@example.com`, `tester-${suffix}`, '$2b$10$dummystoredhashvalueonly']
  );
  return rows[0].user_id;
}
async function createTeam(suffix) {
  const { rows } = await query(`INSERT INTO teams (name) VALUES ($1) RETURNING team_id`, [
    `${PREFIX}-${suffix}`,
  ]);
  return rows[0].team_id;
}
async function addMembership(userId, teamId, role) {
  await query(`INSERT INTO memberships (user_id, team_id, role) VALUES ($1, $2, $3)`, [
    userId,
    teamId,
    role,
  ]);
}

beforeAll(async () => {
  teamA = await createTeam('teamA');
  teamB = await createTeam('teamB');
  leader = await createUser('leader');
  member = await createUser('member');
  outsider = await createUser('outsider');
  await addMembership(leader, teamA, 'team_leader');
  await addMembership(member, teamA, 'team_member');
  // outsider 는 teamA/teamB 모두 비멤버

  leaderToken = authService.signToken({ id: leader, email: `${PREFIX}-leader@example.com` });
  memberToken = authService.signToken({ id: member, email: `${PREFIX}-member@example.com` });
  outsiderToken = authService.signToken({ id: outsider, email: `${PREFIX}-outsider@example.com` });
});

afterAll(async () => {
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]);
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]);
  await closePool();
});

describe('authenticate — 라우트 체인 (BE-05 / AC-06)', () => {
  it('무토큰 시 401', async () => {
    const res = await request(guardApp).get(`/api/teams/${teamA}/any-member`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('잘못된 토큰 시 401', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/any-member`)
      .set('Authorization', 'Bearer garbage.token.value');
    expect(res.status).toBe(401);
  });
});

describe('requireMembership — 타팀 격리 (BE-05 / BR-02)', () => {
  it('팀 멤버는 통과하고 req.membership.role 이 채워진다', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/any-member`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('team_member');
  });

  it('비멤버(outsider) 접근 시 403 FORBIDDEN', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/any-member`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('teamA 팀장이 teamB(비멤버) 접근 시 403 — 파라미터 조작 격리 (BR-02)', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamB}/any-member`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.status).toBe(403);
  });
});

describe('requirePermission — Schedule CUD 권한 (BE-05 / BR-03 / AC-05)', () => {
  it('팀장은 schedule:create 통과 200', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/can-create`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('team_leader');
  });

  it('팀원의 Schedule 생성 시도는 Service 진입 전 403 차단 (AC-05)', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/can-create`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('requireRole — 역할 강제 (BE-05 / BR-03)', () => {
  it('팀장은 leader-only 통과 200', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/leader-only`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.status).toBe(200);
  });

  it('팀원은 leader-only 403', async () => {
    const res = await request(guardApp)
      .get(`/api/teams/${teamA}/leader-only`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me — authenticate 적용 (BE-05 / BR-01)', () => {
  it('유효 토큰으로 200 + 현재 사용자(해시 미포함)', async () => {
    const res = await request(realApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(leader);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('무토큰 시 401', async () => {
    const res = await request(realApp).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

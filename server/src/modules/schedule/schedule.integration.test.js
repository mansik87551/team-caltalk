import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import appModule from '../../app.js';
import poolModule from '../../db/pool.js';
import authService from '../auth/auth.service.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;

const app = createApp();
const PREFIX = `be07-test-${Date.now()}`;
const NONEXISTENT = '00000000-0000-0000-0000-000000000000';

let teamId;
let leaderId;
let memberId;
let outsiderId;
let leaderToken;
let memberToken;
let outsiderToken;

async function createUser(suffix) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING user_id`,
    [`${PREFIX}-${suffix}@example.com`, `tester-${suffix}`, '$2b$10$dummystoredhashvalueonly']
  );
  return rows[0].user_id;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  leaderId = await createUser('leader');
  memberId = await createUser('member');
  outsiderId = await createUser('outsider');
  leaderToken = authService.signToken({ id: leaderId, email: `${PREFIX}-leader@example.com` });
  memberToken = authService.signToken({ id: memberId, email: `${PREFIX}-member@example.com` });
  outsiderToken = authService.signToken({ id: outsiderId, email: `${PREFIX}-outsider@example.com` });

  // 팀 생성(leader=team_leader) 후 member 가입
  const teamRes = await request(app)
    .post('/api/teams')
    .set(auth(leaderToken))
    .send({ name: `${PREFIX}-team` });
  teamId = teamRes.body.id;
  await request(app).post(`/api/teams/${teamId}/members`).set(auth(memberToken));
});

afterAll(async () => {
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]); // schedules/memberships CASCADE
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]);
  await closePool();
});

const win = { from: '2026-06-01T00:00:00Z', to: '2026-06-30T23:59:59Z' };

describe('POST /schedules — 등록·권한·유효성·충돌 (BE-07 / BR-03/06/07/08)', () => {
  it('팀장은 일정 등록 시 201 + conflicts 빈 배열(겹침 없음)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '회의 A', startAt: '2026-06-05T05:00:00Z', endAt: '2026-06-05T06:00:00Z' });
    expect(res.status).toBe(201);
    expect(res.body.schedule).toMatchObject({ title: '회의 A', teamId, createdBy: leaderId });
    expect(res.body.conflicts).toEqual([]);
  });

  it('팀원의 일정 등록 시도는 403 — Service 진입 전 차단 (BR-03/AC-05)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(memberToken))
      .send({ title: '몰래 회의', startAt: '2026-06-06T05:00:00Z', endAt: '2026-06-06T06:00:00Z' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('겹치는 일정 등록 시에도 201 저장 + conflicts[] 경고 (BR-08/AC-01)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '회의 B', startAt: '2026-06-05T05:30:00Z', endAt: '2026-06-05T06:30:00Z' });
    expect(res.status).toBe(201);
    expect(res.body.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.conflicts[0]).toHaveProperty('scheduleId');
    expect(res.body.conflicts.map((c) => c.title)).toContain('회의 A');
  });

  it('경계 접촉(앞 일정 종료 == 새 일정 시작)은 충돌 아님 (BR-07/AC-02)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '경계 회의', startAt: '2026-06-05T06:00:00Z', endAt: '2026-06-05T07:00:00Z' });
    expect(res.status).toBe(201);
    // 회의 A(05~06)와 경계 접촉 → 비충돌. (회의 B 05:30~06:30 와는 겹침)
    expect(res.body.conflicts.map((c) => c.title)).not.toContain('회의 A');
  });

  it('startAt >= endAt 유효성 위반 시 400 (BR-06/AC-04)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '잘못된 회의', startAt: '2026-06-07T06:00:00Z', endAt: '2026-06-07T06:00:00Z' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('비멤버는 등록 시도 시 403 (BR-02)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(outsiderToken))
      .send({ title: 'x', startAt: '2026-06-08T05:00:00Z', endAt: '2026-06-08T06:00:00Z' });
    expect(res.status).toBe(403);
  });
});

describe('GET /schedules — 기간 조회 (BE-07 / FR-03)', () => {
  it('팀원도 조회 가능, 기간 내 일정 배열 반환', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/schedules`)
      .query(win)
      .set(auth(memberToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('from/to 누락 시 400', async () => {
    const res = await request(app).get(`/api/teams/${teamId}/schedules`).set(auth(memberToken));
    expect(res.status).toBe(400);
  });

  it('비멤버 조회 시 403 (BR-02)', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/schedules`)
      .query(win)
      .set(auth(outsiderToken));
    expect(res.status).toBe(403);
  });
});

describe('PUT /schedules/:id — 수정·자기제외 (BE-07 / AC-03/05)', () => {
  let targetId;
  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '수정대상', startAt: '2026-06-10T05:00:00Z', endAt: '2026-06-10T06:00:00Z' });
    targetId = res.body.schedule.id;
  });

  it('팀장이 자신을 시간 확장 수정해도 자기 자신은 충돌 제외 (AC-03)', async () => {
    const res = await request(app)
      .put(`/api/teams/${teamId}/schedules/${targetId}`)
      .set(auth(leaderToken))
      .send({ startAt: '2026-06-10T05:00:00Z', endAt: '2026-06-10T07:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.schedule.endAt).toBeTruthy();
    expect(res.body.conflicts.map((c) => c.scheduleId)).not.toContain(targetId);
  });

  it('팀원의 수정 시도는 403 (AC-05)', async () => {
    const res = await request(app)
      .put(`/api/teams/${teamId}/schedules/${targetId}`)
      .set(auth(memberToken))
      .send({ title: '바꿔치기' });
    expect(res.status).toBe(403);
  });

  it('존재하지 않는 일정 수정 시 404', async () => {
    const res = await request(app)
      .put(`/api/teams/${teamId}/schedules/${NONEXISTENT}`)
      .set(auth(leaderToken))
      .send({ title: '없음' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /schedules/:id — 삭제 (BE-07 / AC-05)', () => {
  let delId;
  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '삭제대상', startAt: '2026-06-15T05:00:00Z', endAt: '2026-06-15T06:00:00Z' });
    delId = res.body.schedule.id;
  });

  it('팀원의 삭제 시도는 403 (AC-05)', async () => {
    const res = await request(app)
      .delete(`/api/teams/${teamId}/schedules/${delId}`)
      .set(auth(memberToken));
    expect(res.status).toBe(403);
  });

  it('팀장 삭제 시 204, 이후 조회되지 않음', async () => {
    const res = await request(app)
      .delete(`/api/teams/${teamId}/schedules/${delId}`)
      .set(auth(leaderToken));
    expect(res.status).toBe(204);
    const { rows } = await query(`SELECT 1 FROM schedules WHERE schedule_id = $1`, [delId]);
    expect(rows).toHaveLength(0);
  });
});

describe('종일 일정 정규화 (BE-07 / BR-07)', () => {
  it('isAllDay 등록 시 [00:00, 익일 00:00) 로 정규화되어 저장된다', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '종일행사', startAt: '2026-06-20T15:30:00Z', endAt: '2026-06-20T16:00:00Z', isAllDay: true });
    expect(res.status).toBe(201);
    expect(res.body.schedule.isAllDay).toBe(true);
    expect(new Date(res.body.schedule.startAt).toISOString()).toBe('2026-06-20T00:00:00.000Z');
    expect(new Date(res.body.schedule.endAt).toISOString()).toBe('2026-06-21T00:00:00.000Z');
  });
});

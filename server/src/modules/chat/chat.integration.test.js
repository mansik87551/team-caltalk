import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import appModule from '../../app.js';
import poolModule from '../../db/pool.js';
import authService from '../auth/auth.service.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;

const app = createApp();
const PREFIX = `be09-test-${Date.now()}`;

let teamId;
let memberId;
let outsiderToken;
let memberToken;

async function createUser(suffix) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING user_id`,
    [`${PREFIX}-${suffix}@example.com`, `tester-${suffix}`, '$2b$10$dummystoredhashvalueonly']
  );
  return rows[0].user_id;
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  const leaderId = await createUser('leader');
  memberId = await createUser('member');
  const outsiderId = await createUser('outsider');
  const leaderToken = authService.signToken({ id: leaderId, email: `${PREFIX}-leader@example.com` });
  memberToken = authService.signToken({ id: memberId, email: `${PREFIX}-member@example.com` });
  outsiderToken = authService.signToken({ id: outsiderId, email: `${PREFIX}-o@example.com` });

  const teamRes = await request(app).post('/api/teams').set(auth(leaderToken)).send({ name: `${PREFIX}-team` });
  teamId = teamRes.body.id;
  await request(app).post(`/api/teams/${teamId}/members`).set(auth(memberToken));
});

afterAll(async () => {
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]); // chat/memberships CASCADE
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]);
  await closePool();
});

describe('POST /chat — 메시지 작성 (BE-09 / FR-07 / BR-05)', () => {
  it('targetDate 명시 작성 시 201 + 그대로 부여, created_at 과 분리', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/chat`)
      .set(auth(memberToken))
      .send({ content: '회의 시간 조정 가능할까요?', targetDate: '2026-06-05' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ teamId, senderId: memberId, content: '회의 시간 조정 가능할까요?' });
    expect(res.body.targetDate).toBe('2026-06-05'); // YYYY-MM-DD 문자열(시간대 오류 없음)
    expect(res.body.createdAt).toBeTruthy();
    // target_date 와 created_at 분리: createdAt 은 작성 시각이라 2026-06-05 와 무관
    expect(res.body.createdAt).not.toBe('2026-06-05');
  });

  it('targetDate 생략 시 서버가 현재 UTC 날짜를 자동 부여(도메인 4.1)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .post(`/api/teams/${teamId}/chat`)
      .set(auth(memberToken))
      .send({ content: '오늘 메시지' });
    expect(res.status).toBe(201);
    expect(res.body.targetDate).toBe(today);
  });

  it('이벤트 확인용 메시지도 정상 작성된다(2026-06-05)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/chat`)
      .set(auth(memberToken))
      .send({ content: '이벤트 확인용', targetDate: '2026-06-05' });
    expect(res.status).toBe(201);
  });

  it('내용 누락 시 400', async () => {
    const res = await request(app).post(`/api/teams/${teamId}/chat`).set(auth(memberToken)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('targetDate 형식 위반 시 400', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/chat`)
      .set(auth(memberToken))
      .send({ content: 'x', targetDate: '2026/06/05' });
    expect(res.status).toBe(400);
  });

  it('비멤버 작성 시 403 (BR-02)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/chat`)
      .set(auth(outsiderToken))
      .send({ content: '침입', targetDate: '2026-06-05' });
    expect(res.status).toBe(403);
  });
});

describe('GET /chat?date= — Daily Chat Log 조회 (BE-09 / BR-05)', () => {
  it('해당 날짜 메시지만 created_at 순으로 반환', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/chat`)
      .query({ date: '2026-06-05' })
      .set(auth(memberToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // 2026-06-05 로 작성한 메시지(2건: 조정 문의 + 이벤트 확인용)만, '오늘 메시지'는 제외
    expect(res.body.every((m) => m.targetDate === '2026-06-05')).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('메시지 없는 날짜는 빈 배열', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/chat`)
      .query({ date: '2020-01-01' })
      .set(auth(memberToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('date 누락 시 400', async () => {
    const res = await request(app).get(`/api/teams/${teamId}/chat`).set(auth(memberToken));
    expect(res.status).toBe(400);
  });

  it('비멤버 조회 시 403 (BR-02)', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/chat`)
      .query({ date: '2026-06-05' })
      .set(auth(outsiderToken));
    expect(res.status).toBe(403);
  });
});

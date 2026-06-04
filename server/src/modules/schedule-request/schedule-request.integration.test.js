import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import appModule from '../../app.js';
import poolModule from '../../db/pool.js';
import authService from '../auth/auth.service.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;

const app = createApp();
const PREFIX = `be10-test-${Date.now()}`;
const NONEXISTENT = '00000000-0000-0000-0000-000000000000';

let teamId;
let leaderId;
let memberId;
let leaderToken;
let memberToken;
let scheduleId;
let originMessageId;

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
  leaderToken = authService.signToken({ id: leaderId, email: `${PREFIX}-leader@example.com` });
  memberToken = authService.signToken({ id: memberId, email: `${PREFIX}-member@example.com` });

  const teamRes = await request(app).post('/api/teams').set(auth(leaderToken)).send({ name: `${PREFIX}-team` });
  teamId = teamRes.body.id;
  await request(app).post(`/api/teams/${teamId}/members`).set(auth(memberToken));

  const schedRes = await request(app)
    .post(`/api/teams/${teamId}/schedules`)
    .set(auth(leaderToken))
    .send({ title: '원본 회의', startAt: '2026-06-05T05:00:00Z', endAt: '2026-06-05T06:00:00Z' });
  scheduleId = schedRes.body.schedule.id;

  const msgRes = await request(app)
    .post(`/api/teams/${teamId}/chat`)
    .set(auth(memberToken))
    .send({ content: '회의 한 시간 미뤄주세요', targetDate: '2026-06-05' });
  originMessageId = msgRes.body.id;
});

afterAll(async () => {
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]); // SCR/schedule/chat CASCADE via team
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]);
  await closePool();
});

describe('POST /schedule-change-requests — 생성 (BE-10 / BR-04 / FR-08)', () => {
  it('팀원이 기존 메시지를 근거로 생성 시 201, status=requested, origin_message_id 연결', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '06:00~07:00로 미뤄주세요', originMessageId });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      teamId,
      scheduleId,
      requesterId: memberId,
      status: 'requested',
      originMessageId,
    });
    expect(res.body.processedBy).toBeNull();
  });

  it('originMessageId 없이 content 만 주면 서버가 메시지를 생성해 연결한다(핵심 차별점)', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '시간 조정 요청', content: '채팅으로 남기는 변경 근거' });
    expect(res.status).toBe(201);
    expect(res.body.originMessageId).toBeTruthy(); // NOT NULL 항상 채워짐
    // 생성된 메시지가 채팅에 존재한다
    const { rows } = await query(`SELECT content FROM chat_messages WHERE message_id = $1`, [
      res.body.originMessageId,
    ]);
    expect(rows[0].content).toBe('채팅으로 남기는 변경 근거');
  });

  it('originMessageId·content 둘 다 없으면 400', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '근거 없음' });
    expect(res.status).toBe(400);
  });

  it('존재하지 않는 일정 대상 시 404', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId: NONEXISTENT, requestContent: 'x', content: 'y' });
    expect(res.status).toBe(404);
  });
});

describe('GET /schedule-change-requests — 목록 (BE-10)', () => {
  it('status=requested 필터 조회', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}/schedule-change-requests`)
      .query({ status: 'requested' })
      .set(auth(leaderToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.every((r) => r.status === 'requested')).toBe(true);
  });
});

describe('PATCH /:id — 처리·상태 전이 (BE-10 / BR-09 / AC-07/08)', () => {
  let reqId;
  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '07:00~08:00로 변경', originMessageId });
    reqId = res.body.id;
  });

  it('팀원의 처리 시도는 403 (AC-08)', async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${reqId}`)
      .set(auth(memberToken))
      .send({ action: 'rejected', rejectReason: '불가' });
    expect(res.status).toBe(403);
  });

  it('팀장이 applied 처리 시 200, status=applied, 대상 Schedule 반영 (AC-07)', async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${reqId}`)
      .set(auth(leaderToken))
      .send({ action: 'applied', scheduleUpdate: { startAt: '2026-06-05T07:00:00Z', endAt: '2026-06-05T08:00:00Z' } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('applied');
    expect(res.body.processedBy).toBe(leaderId);
    expect(res.body.processedAt).toBeTruthy();
    // 대상 Schedule 이 실제로 수정됨
    const { rows } = await query(`SELECT start_at FROM schedules WHERE schedule_id = $1`, [scheduleId]);
    expect(new Date(rows[0].start_at).toISOString()).toBe('2026-06-05T07:00:00.000Z');
  });

  it('종결(applied) 상태 재전이 시 409 (AC-08)', async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${reqId}`)
      .set(auth(leaderToken))
      .send({ action: 'rejected', rejectReason: '이미 반영됨' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('applied 처리 시 scheduleUpdate 누락이면 400', async () => {
    const created = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: 'no update', originMessageId });
    const res = await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${created.body.id}`)
      .set(auth(leaderToken))
      .send({ action: 'applied' });
    expect(res.status).toBe(400);
  });

  it('팀장이 rejected 처리 시 200, status=rejected, reject_reason 기록', async () => {
    const created = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '반려될 요청', originMessageId });
    const res = await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${created.body.id}`)
      .set(auth(leaderToken))
      .send({ action: 'rejected', rejectReason: '일정 변경 불가' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.rejectReason).toBe('일정 변경 불가');
  });

  it('존재하지 않는 변경요청 처리 시 404', async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${NONEXISTENT}`)
      .set(auth(leaderToken))
      .send({ action: 'rejected' });
    expect(res.status).toBe(404);
  });
});

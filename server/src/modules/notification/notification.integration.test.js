import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import appModule from '../../app.js';
import poolModule from '../../db/pool.js';
import authService from '../auth/auth.service.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;

const app = createApp();
const PREFIX = `be11-test-${Date.now()}`;

let teamId;
let leaderId;
let memberId;
let leaderToken;
let memberToken;

async function createUser(suffix) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING user_id`,
    [`${PREFIX}-${suffix}@example.com`, `tester-${suffix}`, '$2b$10$dummystoredhashvalueonly']
  );
  return rows[0].user_id;
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 알림 디스패치는 비동기(fire-and-forget)이므로 조건 만족까지 폴링한다.
async function waitForNotifications(token, predicate, { retries = 40, delay = 25 } = {}) {
  for (let i = 0; i < retries; i += 1) {
    const res = await request(app).get('/api/notifications').set(auth(token));
    if (res.status === 200 && predicate(res.body)) return res.body;
    await sleep(delay);
  }
  const last = await request(app).get('/api/notifications').set(auth(token));
  return last.body;
}

beforeAll(async () => {
  leaderId = await createUser('leader');
  memberId = await createUser('member');
  leaderToken = authService.signToken({ id: leaderId, email: `${PREFIX}-leader@example.com` });
  memberToken = authService.signToken({ id: memberId, email: `${PREFIX}-member@example.com` });

  const teamRes = await request(app).post('/api/teams').set(auth(leaderToken)).send({ name: `${PREFIX}-team` });
  teamId = teamRes.body.id;
  await request(app).post(`/api/teams/${teamId}/members`).set(auth(memberToken));
}, 20000);

afterAll(async () => {
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]);
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]); // notifications CASCADE
  await closePool();
});

describe('도메인 이벤트 → Notification (BE-11 / 도메인 7장)', () => {
  it('ScheduleChangeRequested → 팀장에게 change_requested 알림 생성', async () => {
    // 일정 + 근거 메시지 준비
    const sched = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '원본', startAt: '2026-07-01T05:00:00Z', endAt: '2026-07-01T06:00:00Z' });
    const scheduleId = sched.body.schedule.id;

    // 팀원이 변경요청 생성 → 팀장에게 알림
    await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '미뤄주세요', content: '채팅 근거' });

    const notis = await waitForNotifications(leaderToken, (list) =>
      list.some((n) => n.relatedEvent === 'ScheduleChangeRequested')
    );
    const noti = notis.find((n) => n.relatedEvent === 'ScheduleChangeRequested');
    expect(noti).toBeTruthy();
    expect(noti.recipientId).toBe(leaderId);
    expect(noti.type).toBe('change_requested');
    expect(noti.isRead).toBe(false);
    expect(noti.payload.teamId).toBe(teamId);
  });

  it('ScheduleConflictDetected → 팀장에게 conflict_warning 알림 생성 (BR-08)', async () => {
    // 겹치는 일정 등록 → 충돌 감지 → 팀장 알림
    await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '겹침', startAt: '2026-07-01T05:30:00Z', endAt: '2026-07-01T06:30:00Z' });

    const notis = await waitForNotifications(leaderToken, (list) =>
      list.some((n) => n.relatedEvent === 'ScheduleConflictDetected')
    );
    const noti = notis.find((n) => n.relatedEvent === 'ScheduleConflictDetected');
    expect(noti).toBeTruthy();
    expect(noti.type).toBe('conflict_warning');
  });

  it('ScheduleChangeApplied → 요청자(팀원)에게 change_applied 알림 생성 (AC-07)', async () => {
    const sched = await request(app)
      .post(`/api/teams/${teamId}/schedules`)
      .set(auth(leaderToken))
      .send({ title: '반영대상', startAt: '2026-07-02T05:00:00Z', endAt: '2026-07-02T06:00:00Z' });
    const scheduleId = sched.body.schedule.id;

    const scr = await request(app)
      .post(`/api/teams/${teamId}/schedule-change-requests`)
      .set(auth(memberToken))
      .send({ scheduleId, requestContent: '변경', content: '근거2' });

    await request(app)
      .patch(`/api/teams/${teamId}/schedule-change-requests/${scr.body.id}`)
      .set(auth(leaderToken))
      .send({ action: 'applied', scheduleUpdate: { startAt: '2026-07-02T07:00:00Z', endAt: '2026-07-02T08:00:00Z' } });

    const notis = await waitForNotifications(memberToken, (list) =>
      list.some((n) => n.relatedEvent === 'ScheduleChangeApplied')
    );
    const noti = notis.find((n) => n.relatedEvent === 'ScheduleChangeApplied');
    expect(noti).toBeTruthy();
    expect(noti.recipientId).toBe(memberId);
    expect(noti.type).toBe('change_applied');
  });
});

describe('GET /api/notifications + PATCH read (BE-11)', () => {
  it('무토큰 시 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('?unread=true 는 미읽음만 반환하고, 읽음 처리 후 목록에서 빠진다', async () => {
    const before = await waitForNotifications(leaderToken, (list) => list.length > 0);
    expect(before.length).toBeGreaterThan(0);
    const target = before[0];

    const patch = await request(app)
      .patch(`/api/notifications/${target.id}/read`)
      .set(auth(leaderToken));
    expect(patch.status).toBe(200);
    expect(patch.body.isRead).toBe(true);

    const unread = await request(app)
      .get('/api/notifications')
      .query({ unread: 'true' })
      .set(auth(leaderToken));
    expect(unread.body.some((n) => n.id === target.id)).toBe(false);
  });

  it('타인 알림 읽음 처리 시 403', async () => {
    const memberNotis = await waitForNotifications(memberToken, (list) => list.length > 0);
    const res = await request(app)
      .patch(`/api/notifications/${memberNotis[0].id}/read`)
      .set(auth(leaderToken));
    expect(res.status).toBe(403);
  });

  it('존재하지 않는 알림 읽음 처리 시 404', async () => {
    const res = await request(app)
      .patch(`/api/notifications/00000000-0000-0000-0000-000000000000/read`)
      .set(auth(leaderToken));
    expect(res.status).toBe(404);
  });
});

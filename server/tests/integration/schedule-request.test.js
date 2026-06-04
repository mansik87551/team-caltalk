import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import helpers from './helpers.js';

const { app, request, bearer, signup, createTeam, joinTeam, createSchedule, postChat, cleanup } = helpers;
const PREFIX = `itscr-${Date.now()}`;
const NONEXISTENT = '00000000-0000-0000-0000-000000000000';

let leader;
let member;
let teamId;
let scheduleId;
let originMessageId;

beforeAll(async () => {
  leader = await signup(PREFIX, '팀장');
  member = await signup(PREFIX, '팀원');
  teamId = await createTeam(leader.token, `${PREFIX}-team`);
  await joinTeam(member.token, teamId);
  const sched = await createSchedule(leader.token, teamId, {
    title: '원본 09-10',
    startAt: '2026-10-01T09:00:00Z',
    endAt: '2026-10-01T10:00:00Z',
  });
  scheduleId = sched.body.schedule.id;
  const msg = await postChat(member.token, teamId, { content: '한 시간 미뤄주세요', targetDate: '2026-10-01' });
  originMessageId = msg.body.id;
}, 20000);

afterAll(async () => {
  await cleanup(PREFIX);
  await helpers.pool.closePool();
});

function createScr(token, body) {
  return request(app).post(`/api/teams/${teamId}/schedule-change-requests`).set(bearer(token)).send(body);
}
function processScr(token, requestId, body) {
  return request(app)
    .patch(`/api/teams/${teamId}/schedule-change-requests/${requestId}`)
    .set(bearer(token))
    .send(body);
}

describe('SCR 생성 / origin_message_id 강제 (BE-12 / BR-04 / FR-08)', () => {
  it('originMessageId·content 모두 없으면 400 (origin_message_id NOT NULL 강제)', async () => {
    const res = await createScr(member.token, { scheduleId, requestContent: '근거 없음' });
    expect(res.status).toBe(400);
  });

  it('기존 메시지를 근거로 생성 → 201, requested, originMessageId 연결', async () => {
    const res = await createScr(member.token, {
      scheduleId,
      requestContent: '10:00~11:00로',
      originMessageId,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('requested');
    expect(res.body.originMessageId).toBe(originMessageId);
  });
});

describe('SCR 상태 전이 (BE-12 / BR-09 / AC-07/08)', () => {
  let reqId;
  beforeAll(async () => {
    const res = await createScr(member.token, {
      scheduleId,
      requestContent: '10:00~11:00로 변경',
      originMessageId,
    });
    reqId = res.body.id;
  });

  it('팀원의 처리 시도 → 403 (BR-03/AC-08)', async () => {
    const res = await processScr(member.token, reqId, { action: 'rejected', rejectReason: 'no' });
    expect(res.status).toBe(403);
  });

  it('requested → applied 성공 + 대상 Schedule 실제 반영 (BR-09/AC-07)', async () => {
    const res = await processScr(leader.token, reqId, {
      action: 'applied',
      scheduleUpdate: { startAt: '2026-10-01T10:00:00Z', endAt: '2026-10-01T11:00:00Z' },
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('applied');
    expect(res.body.processedBy).toBe(leader.id);

    // Schedule 이 실제로 반영됨
    const list = await request(app)
      .get(`/api/teams/${teamId}/schedules`)
      .query({ from: '2026-10-01T00:00:00Z', to: '2026-10-01T23:59:59Z' })
      .set(bearer(leader.token));
    const target = list.body.find((s) => s.id === scheduleId);
    expect(new Date(target.startAt).toISOString()).toBe('2026-10-01T10:00:00.000Z');
  });

  it('종결(applied) 상태 재전이 시도 → 409 (BR-09/AC-08)', async () => {
    const res = await processScr(leader.token, reqId, { action: 'rejected', rejectReason: '이미 반영' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('존재하지 않는 변경요청 처리 → 404', async () => {
    const res = await processScr(leader.token, NONEXISTENT, { action: 'rejected' });
    expect(res.status).toBe(404);
  });
});

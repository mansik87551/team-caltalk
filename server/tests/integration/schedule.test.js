import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import helpers from './helpers.js';

const { app, request, bearer, signup, createTeam, joinTeam, createSchedule, cleanup } = helpers;
const PREFIX = `itsched-${Date.now()}`;

let leader;
let member;
let teamId;

beforeAll(async () => {
  leader = await signup(PREFIX, '팀장');
  member = await signup(PREFIX, '팀원');
  teamId = await createTeam(leader.token, `${PREFIX}-team`);
  await joinTeam(member.token, teamId);
}, 20000);

afterAll(async () => {
  await cleanup(PREFIX);
  await helpers.pool.closePool();
});

describe('팀원 CUD 권한 거부 (BE-12 / BR-03 / AC-05)', () => {
  it('팀원의 Schedule POST 시도 → 403 (BR-03/AC-05)', async () => {
    const res = await createSchedule(member.token, teamId, {
      title: 'x',
      startAt: '2026-09-01T05:00:00Z',
      endAt: '2026-09-01T06:00:00Z',
    });
    expect(res.status).toBe(403);
  });

  it('팀원의 Schedule PUT/DELETE 시도 → 403 (BR-03/AC-05)', async () => {
    const created = await createSchedule(leader.token, teamId, {
      title: '대상',
      startAt: '2026-09-02T05:00:00Z',
      endAt: '2026-09-02T06:00:00Z',
    });
    const sid = created.body.schedule.id;
    const put = await request(app)
      .put(`/api/teams/${teamId}/schedules/${sid}`)
      .set(bearer(member.token))
      .send({ title: '변경' });
    expect(put.status).toBe(403);
    const del = await request(app)
      .delete(`/api/teams/${teamId}/schedules/${sid}`)
      .set(bearer(member.token));
    expect(del.status).toBe(403);
  });
});

describe('일정 충돌 등록 (BE-12 / BR-07/08 / AC-01/02)', () => {
  beforeAll(async () => {
    await createSchedule(leader.token, teamId, {
      title: '기준 10-11',
      startAt: '2026-09-10T10:00:00Z',
      endAt: '2026-09-10T11:00:00Z',
    });
  });

  it('겹치는 일정 10:30~11:30 → 201 + conflicts[] 경고 (BR-07/BR-08/AC-01)', async () => {
    const res = await createSchedule(leader.token, teamId, {
      title: '겹침 10:30-11:30',
      startAt: '2026-09-10T10:30:00Z',
      endAt: '2026-09-10T11:30:00Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.conflicts.map((c) => c.title)).toContain('기준 10-11');
  });

  it('경계 접촉 11:00~12:00 → 201 + 기준 일정과 충돌 아님 (BR-07/AC-02)', async () => {
    const res = await createSchedule(leader.token, teamId, {
      title: '경계 11-12',
      startAt: '2026-09-10T11:00:00Z',
      endAt: '2026-09-10T12:00:00Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.conflicts.map((c) => c.title)).not.toContain('기준 10-11');
  });
});

describe('일정 유효성 (BE-12 / BR-06 / AC-04)', () => {
  it('startAt == endAt → 400 (BR-06/AC-04)', async () => {
    const res = await createSchedule(leader.token, teamId, {
      title: '동일',
      startAt: '2026-09-11T05:00:00Z',
      endAt: '2026-09-11T05:00:00Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('endAt < startAt (역전) → 400 (BR-06/AC-04)', async () => {
    const res = await createSchedule(leader.token, teamId, {
      title: '역전',
      startAt: '2026-09-11T06:00:00Z',
      endAt: '2026-09-11T05:00:00Z',
    });
    expect(res.status).toBe(400);
  });
});

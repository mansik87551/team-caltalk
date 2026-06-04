import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import helpers from './helpers.js';

const { app, request, bearer, signup, createTeam, joinTeam, cleanup } = helpers;
const PREFIX = `itauth-${Date.now()}`;

let leaderA;
let teamA;
let outsider;
let leaderB;
let teamB;

beforeAll(async () => {
  leaderA = await signup(PREFIX);
  teamA = await createTeam(leaderA.token, `${PREFIX}-A`);
  outsider = await signup(PREFIX);
  leaderB = await signup(PREFIX);
  teamB = await createTeam(leaderB.token, `${PREFIX}-B`);
}, 20000);

afterAll(async () => {
  await cleanup(PREFIX);
  await helpers.pool.closePool();
});

describe('인증 전제 (BE-12 / BR-01 / AC-06)', () => {
  it('무토큰 요청 시 401 반환 (BR-01/AC-06)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('잘못된 토큰 요청 시 401 반환 (BR-01/AC-06)', async () => {
    const res = await request(app).get('/api/teams').set({ Authorization: 'Bearer bad.token' });
    expect(res.status).toBe(401);
  });
});

describe('팀 소속 전제 / 타팀 격리 (BE-12 / BR-02 / AC-06)', () => {
  it('비멤버의 팀 리소스 접근 시 403 반환 (BR-02/AC-06)', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamA}/members`)
      .set(bearer(outsider.token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('팀 A 멤버가 팀 B 리소스 접근 시 403 — 타팀 격리 (BR-02)', async () => {
    const res = await request(app)
      .get(`/api/teams/${teamB}/members`)
      .set(bearer(leaderA.token));
    expect(res.status).toBe(403);
  });

  it('멤버 본인 팀 접근은 허용 200 (BR-02)', async () => {
    const res = await request(app).get(`/api/teams/${teamA}/members`).set(bearer(leaderA.token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1); // 생성자(leaderA)만
  });
});

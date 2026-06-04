import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import appModule from './app.js';
import poolModule from './db/pool.js';

const { createApp } = appModule;
const { closePool } = poolModule;

const app = createApp();

afterAll(async () => {
  await closePool();
});

describe('app 조립 + GET /health (BE-01 / NFR-06)', () => {
  it('GET /health 가 DB 정상일 때 200 과 db.ok=true 를 반환한다', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db.ok).toBe(true);
    expect(res.body.db.timezone).toBe('UTC'); // NFR-05
  });

  it('미존재 경로는 404 + 표준 에러 포맷을 반환한다 (notFound → errorHandler)', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.stringContaining('/does-not-exist') },
    });
  });

  it('JSON 바디 파서가 동작한다(잘못된 라우트라도 파싱 단계 통과)', async () => {
    const res = await request(app).post('/does-not-exist').send({ a: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

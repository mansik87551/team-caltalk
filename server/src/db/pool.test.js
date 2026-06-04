import { describe, it, expect, afterAll } from 'vitest';
import poolModule from './pool.js';

const { query, healthCheck, closePool } = poolModule;

afterAll(async () => {
  await closePool();
});

describe('db pool (DB-04)', () => {
  it('query("SELECT 1") 성공 (DB-04)', async () => {
    const { rows } = await query('SELECT 1 AS one');
    expect(rows[0].one).toBe(1);
  });

  it('세션 타임존이 UTC 다 (DB-04 / NFR-05)', async () => {
    const { rows } = await query("SELECT current_setting('TimeZone') AS tz");
    expect(rows[0].tz).toBe('UTC');
  });

  it('파라미터라이즈드 바인딩만 허용 — 주입 안전(Hard Rule, DB-04)', async () => {
    const malicious = "x'; DROP TABLE users; --";
    const { rows } = await query('SELECT $1::text AS v', [malicious]);
    // 값으로만 취급되어 그대로 반환된다(SQL 로 실행되지 않음)
    expect(rows[0].v).toBe(malicious);
  });

  it('params 가 배열이 아니면 거부한다 (DB-04)', () => {
    expect(() => query('SELECT $1::int AS v', 5)).toThrow(/배열/);
  });

  it('healthCheck() 가 ok:true 와 UTC 를 반환한다 (DB-04)', async () => {
    const h = await healthCheck();
    expect(h.ok).toBe(true);
    expect(h.timezone).toBe('UTC');
  });
});

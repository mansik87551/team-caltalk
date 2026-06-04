import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import poolModule from '../pool.js';

const { pool, closePool } = poolModule;

// 정규 충돌 쿼리(SSOT)를 파일에서 로딩 — 테스트와 운영이 같은 SQL 을 사용
const CONFLICT_SQL = readFileSync(
  fileURLToPath(new URL('../../../../database/queries/conflict-detection.sql', import.meta.url)),
  'utf8'
);

// 고정 식별자 (트랜잭션 내에서만 사용 후 ROLLBACK)
const USER = '10000000-0000-0000-0000-000000000099';
const TEAM_A = '10000000-0000-0000-0000-0000000000a1'; // AC-01/02/03 (단일 일정)
const TEAM_B = '10000000-0000-0000-0000-0000000000b1'; // 종일 정규화
const S_BASE = '20000000-0000-0000-0000-000000000001'; // 10:00~11:00 (TEAM_A)
const S_ALLDAY = '20000000-0000-0000-0000-0000000000a1'; // [00:00, 익일 00:00) (TEAM_B)
const NONE = '00000000-0000-0000-0000-000000000000'; // 신규 생성 시 self placeholder

let client;

/** 충돌 쿼리 실행 헬퍼 */
async function findConflicts(teamId, selfId, candStart, candEnd) {
  const { rows } = await client.query(CONFLICT_SQL, [teamId, selfId, candStart, candEnd]);
  return rows;
}

beforeAll(async () => {
  client = await pool.connect();
  await client.query('BEGIN');

  await client.query(
    `INSERT INTO users (user_id, email, display_name, password_hash)
     VALUES ($1, 'conflict-test@local', 'tester', 'x')`,
    [USER]
  );
  await client.query(`INSERT INTO teams (team_id, name) VALUES ($1, 'A'), ($2, 'B')`, [TEAM_A, TEAM_B]);

  // TEAM_A: 단일 일정 10:00~11:00
  await client.query(
    `INSERT INTO schedules (schedule_id, team_id, title, start_at, end_at, is_all_day, created_by)
     VALUES ($1, $2, '회의', '2026-06-10T10:00:00Z', '2026-06-10T11:00:00Z', false, $3)`,
    [S_BASE, TEAM_A, USER]
  );

  // TEAM_B: 종일 일정 — 반열린 구간 [2026-06-10 00:00, 2026-06-11 00:00)
  await client.query(
    `INSERT INTO schedules (schedule_id, team_id, title, start_at, end_at, is_all_day, created_by)
     VALUES ($1, $2, '워크샵', '2026-06-10T00:00:00Z', '2026-06-11T00:00:00Z', true, $3)`,
    [S_ALLDAY, TEAM_B, USER]
  );
});

afterAll(async () => {
  if (client) {
    await client.query('ROLLBACK');
    client.release();
  }
  await closePool();
});

describe('충돌 판정 조회 (BR-07)', () => {
  it('detectConflict: 겹치는 일정 1건 반환 (BR-07/AC-01)', async () => {
    // 후보 10:15~10:45 는 base(10:00~11:00) 와 겹친다
    const rows = await findConflicts(TEAM_A, NONE, '2026-06-10T10:15:00Z', '2026-06-10T10:45:00Z');
    expect(rows).toHaveLength(1);
    expect(rows[0].schedule_id).toBe(S_BASE);
  });

  it('detectConflict: 경계 접촉은 충돌 아님, 0건 (BR-07/AC-02, 엄격한 <)', async () => {
    // 후보 11:00~12:00 은 base 의 끝(11:00)과 맞닿을 뿐 겹치지 않는다
    const rows = await findConflicts(TEAM_A, NONE, '2026-06-10T11:00:00Z', '2026-06-10T12:00:00Z');
    expect(rows).toHaveLength(0);
  });

  it('detectConflict: 자기 자신은 제외, 0건 (BR-07/AC-03)', async () => {
    // 후보가 base 와 동일 시간이어도 self 로 제외하면 충돌 없음
    const rows = await findConflicts(TEAM_A, S_BASE, '2026-06-10T10:00:00Z', '2026-06-10T11:00:00Z');
    expect(rows).toHaveLength(0);
  });

  it('detectConflict: 다른 팀 일정과는 충돌하지 않음 (BR-02 격리)', async () => {
    // 02:00~03:00 은 TEAM_B 종일 일정 시간대 안이지만, TEAM_A 로 조회하면 보이지 않아 0건
    const rows = await findConflicts(TEAM_A, NONE, '2026-06-10T02:00:00Z', '2026-06-10T03:00:00Z');
    expect(rows).toHaveLength(0);
  });

  it('detectConflict: 종일 일정은 그날 안의 일정과 겹친다 (BR-07 종일 정규화)', async () => {
    // 종일 [00:00, 익일 00:00) 은 그날 09:00~10:00 후보와 겹친다
    const rows = await findConflicts(TEAM_B, NONE, '2026-06-10T09:00:00Z', '2026-06-10T10:00:00Z');
    expect(rows).toHaveLength(1);
    expect(rows[0].schedule_id).toBe(S_ALLDAY);
  });

  it('detectConflict: 종일 일정 끝 경계(익일 00:00)는 충돌 아님 (반열린 구간 [) )', async () => {
    // 익일 00:00~01:00 은 종일 일정의 끝(익일 00:00)과 맞닿을 뿐 겹치지 않는다
    const rows = await findConflicts(TEAM_B, NONE, '2026-06-11T00:00:00Z', '2026-06-11T01:00:00Z');
    expect(rows).toHaveLength(0);
  });

  it('timestamptz UTC 라운드트립(분 단위) 검증 (NFR-05)', async () => {
    const { rows } = await client.query(
      `SELECT start_at, end_at FROM schedules WHERE schedule_id = $1`,
      [S_BASE]
    );
    // 저장(UTC) → 조회 시 동일 UTC 시점으로 복원
    expect(rows[0].start_at.toISOString()).toBe('2026-06-10T10:00:00.000Z');
    expect(rows[0].end_at.toISOString()).toBe('2026-06-10T11:00:00.000Z');
  });
});

import { describe, it, expect, afterAll } from 'vitest';
import poolModule from './pool.js';

const { withTransaction, query, closePool } = poolModule;

const PREFIX = `tx-test-${Date.now()}`;

afterAll(async () => {
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]);
  await closePool();
});

describe('withTransaction (BE-06)', () => {
  it('정상 흐름은 COMMIT 되어 영속된다', async () => {
    const teamId = await withTransaction(async (exec) => {
      const { rows } = await exec(`INSERT INTO teams (name) VALUES ($1) RETURNING team_id`, [
        `${PREFIX}-commit`,
      ]);
      return rows[0].team_id;
    });
    const { rows } = await query(`SELECT name FROM teams WHERE team_id = $1`, [teamId]);
    expect(rows[0].name).toBe(`${PREFIX}-commit`);
  });

  it('콜백 예외 시 ROLLBACK 되어 아무것도 남지 않는다', async () => {
    await expect(
      withTransaction(async (exec) => {
        await exec(`INSERT INTO teams (name) VALUES ($1)`, [`${PREFIX}-rollback`]);
        throw new Error('의도적 실패');
      })
    ).rejects.toThrow('의도적 실패');

    const { rows } = await query(`SELECT 1 FROM teams WHERE name = $1`, [`${PREFIX}-rollback`]);
    expect(rows).toHaveLength(0);
  });

  it('exec 도 배열이 아닌 params 를 거부한다 (Hard Rule)', async () => {
    await expect(
      withTransaction(async (exec) => {
        await exec(`SELECT $1::int AS v`, 5);
      })
    ).rejects.toThrow(/배열/);
  });
});

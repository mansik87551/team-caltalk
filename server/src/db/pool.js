'use strict';

/**
 * PostgreSQL 커넥션 풀 + 파라미터라이즈드 쿼리 진입점 (NFR-02, Hard Rule)
 *
 * - 풀 설정·DATABASE_URL 은 config 에서 주입받는다(process.env 직접 참조 금지).
 * - 모든 쿼리는 query(text, params) 단일 헬퍼를 통해 $1 바인딩으로만 실행한다.
 *   문자열 연결 SQL 은 금지(Hard Rule, docs/4 §7.2).
 * - 모든 세션 타임존을 UTC 로 고정한다(NFR-05).
 */

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.pool.max,
  idleTimeoutMillis: config.pool.idleTimeoutMillis,
  connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
  // 연결 시작 옵션으로 세션 타임존을 UTC 로 고정한다(DB 기본값과 무관하게 보장, NFR-05).
  // 별도 SET 쿼리를 쏘지 않아 pg 의 동시 query 경고도 발생하지 않는다.
  options: '-c timezone=UTC',
});

// 유휴 클라이언트 오류로 프로세스가 죽지 않도록 로깅만 한다(로거는 BE-01 에서 교체).
pool.on('error', (err) => {
  console.error('[pool] idle client error:', err.message);
});

/**
 * 파라미터라이즈드 쿼리 단일 진입점.
 * @param {string} text   - $1, $2 … 플레이스홀더 SQL
 * @param {Array}  params - 바인딩 값 배열(없으면 빈 배열)
 * @returns {Promise<import('pg').QueryResult>}
 */
function query(text, params = []) {
  if (typeof text !== 'string') {
    throw new TypeError('query(text, params): text 는 문자열이어야 합니다');
  }
  if (!Array.isArray(params)) {
    throw new TypeError('query(text, params): params 는 배열이어야 합니다(문자열 연결 금지)');
  }
  return pool.query(text, params);
}

/**
 * 헬스체크: DB 연결·응답과 세션 타임존(UTC)을 확인한다.
 * @returns {Promise<{ok: boolean, timezone: string}>}
 */
async function healthCheck() {
  const { rows } = await pool.query("SELECT 1 AS ok, current_setting('TimeZone') AS timezone");
  return { ok: rows[0].ok === 1, timezone: rows[0].timezone };
}

/**
 * 트랜잭션 실행 헬퍼. callback 에 트랜잭션 바운드 query 함수(exec)를 넘긴다.
 * 성공 시 COMMIT, 예외 시 ROLLBACK 한다(원자성 보장, 예: 팀 생성+리더 멤버십 OI-2).
 * exec 도 파라미터라이즈드 바인딩만 허용한다(Hard Rule).
 * @template T
 * @param {(exec: (text: string, params?: Array) => Promise<import('pg').QueryResult>) => Promise<T>} callback
 * @returns {Promise<T>}
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exec = (text, params = []) => {
      if (!Array.isArray(params)) {
        throw new TypeError('exec(text, params): params 는 배열이어야 합니다(문자열 연결 금지)');
      }
      return client.query(text, params);
    };
    const result = await callback(exec);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** graceful shutdown: 풀의 모든 커넥션을 정리한다. */
async function closePool() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, healthCheck, closePool };

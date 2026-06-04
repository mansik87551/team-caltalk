'use strict';

/**
 * 환경설정 단일 진입점 (구조원칙 5.1 / 6.3)
 *
 * - env 는 오직 이 모듈에서만 로딩한다. 다른 모듈의 process.env 직접 참조 금지(DB-04 DoD).
 * - 필수 키 누락 시 즉시 부팅 실패시킨다(BE-01 방향성).
 * - 루트 .env 를 로딩한다(server/ 하위에서 실행해도 동일하게 동작).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`필수 환경변수 누락: ${key} (.env 또는 .env.example 참고)`);
  }
  return value;
}

function intOr(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function strOr(key, fallback) {
  const raw = process.env[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: intOr('PORT', 3000),
  databaseUrl: required('DATABASE_URL'),
  pool: {
    max: intOr('POSTGRES_POOL_MAX', 10),
    idleTimeoutMillis: intOr('POSTGRES_POOL_IDLE_MS', 30000),
    connectionTimeoutMillis: intOr('POSTGRES_POOL_CONN_TIMEOUT_MS', 5000),
  },
  // JWT: 시크릿은 보안 키이므로 필수(누락 시 부팅 실패, BE-01 DoD / docs/4 §7.2).
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessTtl: strOr('JWT_ACCESS_TTL', '15m'),
  },
  // CORS 화이트리스트 — 쉼표 구분 오리진 목록. 미설정 시 로컬 개발 오리진만 허용(와일드카드 금지, docs/4 §5.2).
  corsOrigins: strOr('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  logLevel: strOr('LOG_LEVEL', 'info'),
};

module.exports = config;

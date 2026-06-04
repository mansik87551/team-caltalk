'use strict';

/**
 * pino 구조화 로거 (BE-01, docs/4 §5.3)
 *
 * - 로그 레벨은 config 에서만 주입받는다(process.env 직접 참조 금지).
 * - 민감정보(password/token/authorization)는 redact 로 마스킹한다(Hard Rule, docs/4 §5.3).
 *   평문 비밀번호·토큰은 로그에 절대 남기지 않는다.
 * - 개발 환경에서는 사람이 읽기 쉬운 출력을 위해 pino-pretty 가 설치돼 있으면 사용한다.
 */

const pino = require('pino');
const config = require('../config');

// 마스킹할 필드 경로. 중첩 위치(body, headers, req.headers 등)를 폭넓게 커버한다.
const redactPaths = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'authorization',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
];

const logger = pino({
  // 테스트 환경에서는 로그를 끄어 출력 노이즈를 없앤다.
  level: config.env === 'test' ? 'silent' : config.logLevel,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  // 운영 표준 필드명으로 맞춘다.
  base: { service: 'team-caltalk-server', env: config.env },
});

module.exports = logger;

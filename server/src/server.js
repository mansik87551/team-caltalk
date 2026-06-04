'use strict';

/**
 * HTTP 서버 부트스트랩 (BE-01)
 *
 * - createApp() 으로 조립된 앱을 받아 포트에 바인딩한다.
 * - SIGINT/SIGTERM 수신 시 HTTP 서버와 DB 풀을 graceful 하게 정리한다.
 * - config 로딩(필수 env 검증)은 require 시점에 수행되어, 누락 시 즉시 부팅 실패한다.
 */

const config = require('./config');
const logger = require('./utils/logger');
const { createApp } = require('./app');
const { closePool } = require('./db/pool');
const { attachSocketServer } = require('./sockets');

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.env }, 'team-caltalk server 시작');
});

// WebSocket 게이트웨이 부착(팀 룸 + JWT 핸드셰이크, NFR-03)
const io = attachSocketServer(server);

async function shutdown(signal) {
  logger.info({ signal }, '종료 신호 수신 — graceful shutdown 시작');
  io.close();
  server.close(async () => {
    try {
      await closePool();
      logger.info('정리 완료 — 프로세스 종료');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, '종료 중 오류');
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, server };

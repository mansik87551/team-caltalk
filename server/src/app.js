'use strict';

/**
 * Express 앱 조립 (BE-01, docs/4 §2.1 / §5.2 / §5.3)
 *
 * 미들웨어 체인 순서:
 *   1) pino-http  — 요청별 구조화 로깅(req.log 주입, 민감정보 redact)
 *   2) cors       — CORS 화이트리스트(와일드카드 금지)
 *   3) express.json — JSON 바디 파싱
 *   4) routes     — 기능 라우터
 *   5) notFound   — 매칭 실패 시 404 AppError 위임
 *   6) errorHandler — 표준 에러 포맷 직렬화(체인 마지막)
 *
 * 이 파일은 조립만 한다(비즈니스 로직·포트 바인딩 금지 — 바인딩은 server.js).
 */

const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error-handler');

function createApp() {
  const app = express();

  // 1) 요청 로깅 — req.log 로 자식 로거를 주입한다.
  app.use(pinoHttp({ logger }));

  // 2) CORS — 화이트리스트에 없는 오리진은 거부(docs/4 §5.2).
  app.use(
    cors({
      origin(origin, callback) {
        // 동일 출처/서버-투-서버 요청(Origin 헤더 없음)은 허용한다.
        if (!origin || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS 차단: 허용되지 않은 오리진(${origin})`));
      },
      credentials: true,
    })
  );

  // 3) JSON 바디 파싱
  app.use(express.json());

  // 4) 라우터
  app.use('/', routes);

  // 5) 404 → AppError 위임
  app.use(notFoundHandler);

  // 6) 중앙 에러 핸들러(마지막)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

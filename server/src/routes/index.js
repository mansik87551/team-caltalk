'use strict';

/**
 * 루트 라우터 (BE-01)
 *
 * - GET /health: DB 커넥션 상태를 반영한 헬스체크(NFR-06). DB 실패 시 503.
 * - 기능별 라우터(auth, teams, schedules …)는 후속 작업(BE-02+)에서 여기에 마운트한다.
 *
 * 레이어링 규칙: 라우터는 요청을 컨트롤러로 위임만 한다(비즈니스 로직 금지, docs/4 §2.1).
 * /health 는 인프라 점검이라 예외적으로 db 헬스 헬퍼를 직접 호출한다.
 */

const express = require('express');
const { healthCheck } = require('../db/pool');
const authRoutes = require('../modules/auth/auth.routes');

const router = express.Router();

// 기능별 라우터 마운트
router.use('/api/auth', authRoutes);

/**
 * GET /health — 라이브니스 + DB 레디니스.
 * DB 응답 정상: 200 { status: 'ok', db: { ok, timezone } }
 * DB 실패:      503 { status: 'degraded', db: { ok: false } }
 */
router.get('/health', async (req, res) => {
  try {
    const db = await healthCheck();
    res.status(200).json({ status: 'ok', db });
  } catch (err) {
    if (req.log) req.log.error({ err }, 'health check 실패: DB 응답 없음');
    res.status(503).json({ status: 'degraded', db: { ok: false } });
  }
});

module.exports = router;

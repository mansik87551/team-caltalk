'use strict';

/**
 * 인증 라우터 (BE-04) — /api/auth 하위에 마운트된다.
 *
 * - POST /signup : 회원가입(201, bcrypt 해시, 중복 409)
 * - POST /login  : 로그인(200, JWT 액세스 토큰)
 * - GET  /me     : 현재 사용자 조회 — 인증 미들웨어 의존(BE-05)에서 추가 예정
 */

const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const { authenticate } = require('../../middlewares/authenticate');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/signup', asyncHandler(authController.signup));
router.post('/login', asyncHandler(authController.login));
// 인증 필요: authenticate 통과 후에만 진입(BR-01)
router.get('/me', authenticate, asyncHandler(authController.me));

module.exports = router;

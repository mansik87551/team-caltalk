'use strict';

/**
 * 인증 미들웨어 (BE-05, BR-01 / AC-06 / docs/4 §5.2 Hard Rule)
 *
 * - Authorization: Bearer <token> 에서 JWT 를 추출·검증하고 req.user 를 주입한다.
 * - 무토큰/형식오류/위조/만료 시 401 UNAUTHORIZED 로 차단한다(Service 진입 차단).
 * - JWT 검증은 BE-04 auth.service.verifyToken 을 재사용한다(WS 핸드셰이크 BE-08 에서도 재사용 가능).
 */

const { AppError } = require('./error-handler');
const authService = require('../modules/auth/auth.service');

/** Authorization 헤더에서 Bearer 토큰만 추출한다. 없으면 null. */
function extractBearerToken(header) {
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * JWT 를 검증하고 req.user = { userId, email } 를 주입하는 Express 미들웨어.
 */
function authenticate(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', '인증 토큰이 필요합니다'));
  }
  try {
    const payload = authService.verifyToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    return next();
  } catch (err) {
    return next(new AppError(401, 'UNAUTHORIZED', '유효하지 않거나 만료된 토큰입니다'));
  }
}

module.exports = { authenticate, extractBearerToken };

'use strict';

/**
 * 인증 서비스 (BE-04, FR-01 / BR-01 / NFR-04)
 *
 * - 비밀번호는 bcrypt 로 해시 저장한다(평문 절대 금지, Hard Rule docs/4 §7.2).
 * - JWT 액세스 토큰만 발급한다(OI-4, 리프레시 미도입). 시크릿/TTL 은 config 주입.
 * - req/res 를 직접 의존하지 않는다(레이어링, docs/4 §2.1). Controller 가 파싱/직렬화 담당.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../../config');
const { AppError } = require('../../middlewares/error-handler');
const authRepository = require('./auth.repository');

const BCRYPT_ROUNDS = 10;
const PG_UNIQUE_VIOLATION = '23505';

/**
 * 내부 사용자 객체 → 외부 노출용 공개 객체. passwordHash 를 반드시 제거한다(swagger User 계약).
 */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** JWT 액세스 토큰 발급. payload 에 userId, email 포함(BR-01 기반). */
function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

/** JWT 검증(BE-05 인증 미들웨어에서 재사용). 실패 시 throw. */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * 회원가입: bcrypt 해시 → 저장 → 토큰 발급.
 * 이메일 중복 시 409 EMAIL_ALREADY_EXISTS.
 * @param {{ email: string, displayName: string, password: string }} input
 * @returns {Promise<{ token: string, user: object }>}
 */
async function signup({ email, displayName, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    user = await authRepository.createUser({ email, displayName, passwordHash });
  } catch (err) {
    if (err && err.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', '이미 사용 중인 이메일입니다');
    }
    throw err;
  }
  return { token: signToken(user), user: toPublicUser(user) };
}

/**
 * 로그인: 사용자 조회 → bcrypt 검증 → 토큰 발급.
 * 미존재/불일치 모두 401 INVALID_CREDENTIALS(계정 존재 여부 노출 방지).
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ token: string, user: object }>}
 */
async function login({ email, password }) {
  const user = await authRepository.findByEmail(email);
  // 미존재라도 동일한 비용/응답으로 처리해 계정 열거를 방지한다.
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }
  return { token: signToken(user), user: toPublicUser(user) };
}

module.exports = { signup, login, verifyToken, signToken, toPublicUser };

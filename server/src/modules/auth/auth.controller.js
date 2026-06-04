'use strict';

/**
 * 인증 컨트롤러 (BE-04)
 *
 * - req/res 파싱·zod 검증 위임·응답 직렬화만 담당한다(비즈니스 로직 금지, docs/4 §2.1).
 * - zod 검증 실패는 400 VALIDATION_ERROR 로 매핑한다.
 */

const { AppError } = require('../../middlewares/error-handler');
const authService = require('./auth.service');
const { signupSchema, loginSchema } = require('./auth.schema');

/** zod 스키마로 body 를 검증한다. 실패 시 첫 메시지를 담아 400 AppError. */
function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first ? first.message : '입력값이 올바르지 않습니다';
    throw new AppError(400, 'VALIDATION_ERROR', message);
  }
  return result.data;
}

async function signup(req, res) {
  const data = validate(signupSchema, req.body);
  const result = await authService.signup(data);
  res.status(201).json(result);
}

async function login(req, res) {
  const data = validate(loginSchema, req.body);
  const result = await authService.login(data);
  res.status(200).json(result);
}

module.exports = { signup, login };

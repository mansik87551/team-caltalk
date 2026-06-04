'use strict';

/**
 * 인증 입력 검증 스키마 (BE-04, zod)
 *
 * 입력 검증은 Service 진입 전 Controller 경계에서 수행한다(docs/4 §5.2).
 * swagger SignupRequest/LoginRequest 계약과 일치시킨다.
 */

const { z } = require('zod');

const signupSchema = z.object({
  email: z.string().email('유효한 이메일 형식이어야 합니다'),
  displayName: z.string().min(1, '표시 이름은 1자 이상이어야 합니다').max(100),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다').max(200),
});

const loginSchema = z.object({
  email: z.string().email('유효한 이메일 형식이어야 합니다'),
  password: z.string().min(1, '비밀번호는 필수입니다'),
});

module.exports = { signupSchema, loginSchema };

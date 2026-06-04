/** 인증 폼 zod 스키마 (FE-04) — 서버 검증 규칙과 정합. */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력하세요').email('유효한 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

export const signupSchema = z.object({
  email: z.string().min(1, '이메일을 입력하세요').email('유효한 이메일 형식이 아닙니다'),
  displayName: z.string().min(1, '이름을 입력하세요').max(100),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다').max(200),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

import { describe, it, expect, vi } from 'vitest';
import authn from './authenticate.js';
import authService from '../modules/auth/auth.service.js';

const { authenticate, extractBearerToken } = authn;

const validToken = authService.signToken({
  id: '22222222-2222-2222-2222-222222222222',
  email: 'mw@example.com',
});

describe('extractBearerToken (BE-05)', () => {
  it('Bearer 토큰을 추출한다', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });
  it('스킴이 Bearer 가 아니면 null', () => {
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('abc')).toBeNull();
  });
  it('헤더가 없거나 토큰이 비면 null', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Bearer ')).toBeNull();
  });
});

describe('authenticate 미들웨어 (BE-05 / BR-01 / AC-06)', () => {
  it('무토큰 시 401 UNAUTHORIZED 로 차단한다 (AC-06)', () => {
    const next = vi.fn();
    authenticate({ headers: {} }, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('잘못된 토큰 시 401 로 차단한다 (AC-06)', () => {
    const next = vi.fn();
    authenticate({ headers: { authorization: 'Bearer not.a.real.token' } }, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('유효 토큰 시 req.user 를 주입하고 통과한다 (BR-01)', () => {
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const next = vi.fn();
    authenticate(req, {}, next);
    expect(next).toHaveBeenCalledWith(); // 인자 없이 통과
    expect(req.user).toEqual({
      userId: '22222222-2222-2222-2222-222222222222',
      email: 'mw@example.com',
    });
  });
});

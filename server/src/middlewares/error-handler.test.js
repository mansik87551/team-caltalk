import { describe, it, expect, vi } from 'vitest';
import errorHandlerModule from './error-handler.js';

const { AppError, notFoundHandler, errorHandler } = errorHandlerModule;

// Express res 모킹 — status().json() 체이닝 캡처
function mockRes() {
  const res = {};
  res.statusCode = undefined;
  res.body = undefined;
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('AppError (BE-01)', () => {
  it('상태코드 매핑 팩토리가 올바른 코드를 만든다 (docs/4 §5.3)', () => {
    expect(AppError.badRequest().statusCode).toBe(400);
    expect(AppError.unauthorized().statusCode).toBe(401);
    expect(AppError.forbidden().statusCode).toBe(403);
    expect(AppError.notFound().statusCode).toBe(404);
    expect(AppError.conflict().statusCode).toBe(409);
  });

  it('isOperational 플래그가 true 다', () => {
    expect(AppError.badRequest().isOperational).toBe(true);
  });
});

describe('errorHandler (BE-01)', () => {
  it('AppError 를 표준 포맷 { error: { code, message } } 로 직렬화한다', () => {
    const res = mockRes();
    const err = AppError.forbidden('팀장만 가능합니다', 'FORBIDDEN');
    errorHandler(err, {}, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: { code: 'FORBIDDEN', message: '팀장만 가능합니다' } });
  });

  it('예상치 못한 에러는 500 + 내부 메시지 비노출', () => {
    const res = mockRes();
    errorHandler(new Error('DB password leaked in message'), {}, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다' },
    });
  });

  it('req.log 가 있으면 5xx 는 error, 4xx 는 warn 으로 로깅한다', () => {
    const log = { error: vi.fn(), warn: vi.fn() };
    const res4 = mockRes();
    errorHandler(AppError.badRequest('bad'), { log }, res4, () => {});
    expect(log.warn).toHaveBeenCalledOnce();
    expect(log.error).not.toHaveBeenCalled();

    const res5 = mockRes();
    errorHandler(new Error('boom'), { log }, res5, () => {});
    expect(log.error).toHaveBeenCalledOnce();
  });
});

describe('notFoundHandler (BE-01)', () => {
  it('매칭 라우트가 없으면 404 AppError 를 next 로 위임한다', () => {
    const next = vi.fn();
    notFoundHandler({ method: 'GET', originalUrl: '/nope' }, {}, next);
    expect(next).toHaveBeenCalledOnce();
    const passed = next.mock.calls[0][0];
    expect(passed).toBeInstanceOf(AppError);
    expect(passed.statusCode).toBe(404);
  });
});

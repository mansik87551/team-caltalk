import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import validateModule from './validate.js';

const { validate } = validateModule;

const schema = z.object({
  name: z.string().min(1, 'name 은 필수입니다'),
  age: z.number().int().positive('age 는 양의 정수여야 합니다'),
});

describe('validate 미들웨어 (BE-05)', () => {
  it('검증 통과 시 파싱된 값을 req[source] 에 저장하고 통과한다', () => {
    const req = { body: { name: '홍길동', age: 30 } };
    const next = vi.fn();
    validate(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: '홍길동', age: 30 });
  });

  it('검증 위반 시 400 VALIDATION_ERROR + details 를 반환한다', () => {
    const req = { body: { name: '', age: -1 } };
    const next = vi.fn();
    validate(schema)(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(err.details)).toBe(true);
    expect(err.details.length).toBeGreaterThan(0);
    expect(err.details[0]).toHaveProperty('path');
    expect(err.details[0]).toHaveProperty('message');
  });

  it('source=params 도 검증한다', () => {
    const paramsSchema = z.object({ teamId: z.string().uuid('uuid 형식이어야 합니다') });
    const req = { params: { teamId: 'not-uuid' } };
    const next = vi.fn();
    validate(paramsSchema, 'params')(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import appModule from '../../app.js';
import poolModule from '../../db/pool.js';
import authService from './auth.service.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;

const app = createApp();

// 동시 실행/재실행 충돌을 피하기 위해 고유 이메일 prefix 사용. 종료 시 정리한다.
const EMAIL_PREFIX = `be04-test-${Date.now()}`;
const email = `${EMAIL_PREFIX}@example.com`;
const password = 'P@ssw0rd!';
const displayName = '통합테스트유저';

beforeAll(async () => {
  await query('DELETE FROM users WHERE email LIKE $1', [`be04-test-%@example.com`]);
});

afterAll(async () => {
  await query('DELETE FROM users WHERE email LIKE $1', [`be04-test-%@example.com`]);
  await closePool();
});

describe('POST /api/auth/signup (BE-04 / FR-01)', () => {
  it('신규 회원가입 시 201 + token + user(해시 미포함) 반환 (AC: signup 201)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email, displayName, password });
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email, displayName });
    expect(res.body.user.id).toBeTruthy();
    // 응답에 해시/평문 비밀번호가 절대 노출되지 않는다(Hard Rule).
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain('password_hash');
    expect(raw).not.toContain(password);
  });

  it('DB 에 bcrypt 해시($2 접두)로 저장된다 (NFR-04)', async () => {
    const { rows } = await query('SELECT password_hash FROM users WHERE email = $1', [email]);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toBe(password);
  });

  it('이메일 중복 시 409 EMAIL_ALREADY_EXISTS (DoD)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email, displayName, password });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('형식 위반(짧은 비밀번호) 시 400 VALIDATION_ERROR (DoD)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: `${EMAIL_PREFIX}-2@example.com`, displayName, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('이메일 형식 위반 시 400 (DoD)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', displayName, password });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login (BE-04 / FR-01)', () => {
  it('올바른 자격증명으로 200 + 검증 가능한 JWT 반환 (DoD)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    const payload = authService.verifyToken(res.body.token);
    expect(payload.email).toBe(email);
    expect(payload.userId).toBe(res.body.user.id);
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  it('비밀번호 불일치 시 401 INVALID_CREDENTIALS (DoD)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass99!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('미존재 이메일 시 401 INVALID_CREDENTIALS (계정 열거 방지, AC-06)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `${EMAIL_PREFIX}-nope@example.com`, password });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('필수 필드 누락 시 400 (DoD)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

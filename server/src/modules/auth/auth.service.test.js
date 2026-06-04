import { describe, it, expect } from 'vitest';
import authService from './auth.service.js';

const { signToken, verifyToken, toPublicUser } = authService;

const sampleUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'hong@example.com',
  displayName: '홍길동',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
  createdAt: '2026-06-02T09:00:00Z',
  updatedAt: '2026-06-02T09:00:00Z',
};

describe('auth.service (BE-04)', () => {
  describe('toPublicUser', () => {
    it('passwordHash 를 응답 객체에서 제거한다 (NFR-04 Hard Rule)', () => {
      const pub = toPublicUser(sampleUser);
      expect(pub).toEqual({
        id: sampleUser.id,
        email: sampleUser.email,
        displayName: sampleUser.displayName,
        createdAt: sampleUser.createdAt,
        updatedAt: sampleUser.updatedAt,
      });
      expect(pub).not.toHaveProperty('passwordHash');
    });
  });

  describe('signToken / verifyToken (OI-4 액세스 단독)', () => {
    it('발급한 토큰을 검증하면 userId, email 이 복원된다 (BR-01)', () => {
      const token = signToken(sampleUser);
      expect(typeof token).toBe('string');
      const payload = verifyToken(token);
      expect(payload.userId).toBe(sampleUser.id);
      expect(payload.email).toBe(sampleUser.email);
      expect(payload.exp).toBeGreaterThan(payload.iat); // 만료 TTL 적용
    });

    it('위조/변조 토큰은 검증에 실패한다', () => {
      expect(() => verifyToken('not.a.valid.token')).toThrow();
    });
  });
});

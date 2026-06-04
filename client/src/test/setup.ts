/**
 * 테스트 부트스트랩 (FE-02) — jsdom + jest-dom 매처 + MSW 서버 라이프사이클.
 */
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';

// 기본 핸들러 없음. 각 테스트가 server.use(...) 로 등록한다. 미등록 요청은 에러.
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup(); // globals 미사용이므로 RTL 렌더를 수동 정리(누적 방지)
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

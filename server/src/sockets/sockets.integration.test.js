import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';

import appModule from '../app.js';
import poolModule from '../db/pool.js';
import authService from '../modules/auth/auth.service.js';
import socketsModule from './index.js';

const { createApp } = appModule;
const { query, closePool } = poolModule;
const { attachSocketServer } = socketsModule;

const PREFIX = `be08-test-${Date.now()}`;
const app = createApp();
let server;
let io;
let baseUrl;

let teamId;
let leaderId;
let memberId;
let leaderToken;
let memberToken;

async function createUser(suffix) {
  const { rows } = await query(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING user_id`,
    [`${PREFIX}-${suffix}@example.com`, `tester-${suffix}`, '$2b$10$dummystoredhashvalueonly']
  );
  return rows[0].user_id;
}
const authHeader = (t) => ({ Authorization: `Bearer ${t}` });

function connect(token) {
  return ioClient(baseUrl, { auth: { token }, transports: ['websocket'], reconnection: false });
}
/** 소켓에서 특정 이벤트 1회 수신을 기다린다. */
function once(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${event}`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

beforeAll(async () => {
  leaderId = await createUser('leader');
  memberId = await createUser('member');
  leaderToken = authService.signToken({ id: leaderId, email: `${PREFIX}-leader@example.com` });
  memberToken = authService.signToken({ id: memberId, email: `${PREFIX}-member@example.com` });

  const teamRes = await request(app).post('/api/teams').set(authHeader(leaderToken)).send({ name: `${PREFIX}-team` });
  teamId = teamRes.body.id;
  await request(app).post(`/api/teams/${teamId}/members`).set(authHeader(memberToken));

  server = http.createServer(app);
  io = attachSocketServer(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
}, 20000);

afterAll(async () => {
  if (io) io.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await query(`DELETE FROM teams WHERE name LIKE $1`, [`${PREFIX}-%`]);
  await query(`DELETE FROM users WHERE email LIKE $1`, [`${PREFIX}-%@example.com`]);
  await closePool();
});

describe('WS 핸드셰이크 인증 (BE-08 / BR-01)', () => {
  it('유효 토큰으로 연결 성공 + connection:ready 에 소속 팀 포함', async () => {
    const socket = connect(leaderToken);
    try {
      const ready = await once(socket, 'connection:ready');
      expect(ready.userId).toBe(leaderId);
      expect(ready.teams).toContain(teamId);
    } finally {
      socket.disconnect();
    }
  });

  it('무효 토큰은 연결 거부(connect_error)', async () => {
    const socket = connect('garbage.token.value');
    try {
      const err = await new Promise((resolve) => socket.on('connect_error', resolve));
      expect(err.message).toBe('unauthorized');
    } finally {
      socket.disconnect();
    }
  });

  it('토큰 누락도 연결 거부', async () => {
    const socket = connect(undefined);
    try {
      const err = await new Promise((resolve) => socket.on('connect_error', resolve));
      expect(err.message).toBe('unauthorized');
    } finally {
      socket.disconnect();
    }
  });
});

describe('팀 룸 브로드캐스트 (BE-08 / NFR-03 / BE-09 연계)', () => {
  it('팀 멤버가 채팅 작성 시 같은 팀 룸 소켓이 chat:message 를 수신', async () => {
    const socket = connect(memberToken);
    try {
      await once(socket, 'connection:ready');
      const messagePromise = once(socket, 'chat:message');

      // REST 로 채팅 작성 → ChatMessageCreated 이벤트 → team 룸 브로드캐스트
      await request(app)
        .post(`/api/teams/${teamId}/chat`)
        .set(authHeader(leaderToken))
        .send({ content: '실시간 안녕', targetDate: '2026-06-05' });

      const msg = await messagePromise;
      expect(msg.content).toBe('실시간 안녕');
      expect(msg.teamId).toBe(teamId);
    } finally {
      socket.disconnect();
    }
  });

  it('팀장이 일정 등록 시 team 룸으로 schedule:created 브로드캐스트', async () => {
    const socket = connect(memberToken);
    try {
      await once(socket, 'connection:ready');
      const evt = once(socket, 'schedule:created');
      await request(app)
        .post(`/api/teams/${teamId}/schedules`)
        .set(authHeader(leaderToken))
        .send({ title: 'WS 일정', startAt: '2026-08-01T05:00:00Z', endAt: '2026-08-01T06:00:00Z' });
      const payload = await evt;
      expect(payload.teamId).toBe(teamId);
      expect(payload.scheduleId).toBeTruthy();
    } finally {
      socket.disconnect();
    }
  });

  it('team:join 으로 비멤버가 타팀 룸 참여 시도 시 거부(forbidden)', async () => {
    // 다른 팀 생성(leader 소유) — member 는 비멤버
    const otherTeam = await request(app)
      .post('/api/teams')
      .set(authHeader(leaderToken))
      .send({ name: `${PREFIX}-other` });
    const socket = connect(memberToken);
    try {
      await once(socket, 'connection:ready');
      const ack = await new Promise((resolve) =>
        socket.emit('team:join', { teamId: otherTeam.body.id }, resolve)
      );
      expect(ack.ok).toBe(false);
      expect(ack.error).toBe('forbidden');
    } finally {
      socket.disconnect();
    }
  });
});

describe('알림 WS 푸시 (BE-08 + BE-11)', () => {
  it('충돌 감지 시 팀장 개인 룸으로 notification:new 푸시', async () => {
    const socket = connect(leaderToken);
    try {
      await once(socket, 'connection:ready');
      const notiPromise = once(socket, 'notification:new');
      // 겹치는 일정 등록 → ScheduleConflictDetected → 팀장 알림
      await request(app)
        .post(`/api/teams/${teamId}/schedules`)
        .set(authHeader(leaderToken))
        .send({ title: '겹침WS', startAt: '2026-08-01T05:30:00Z', endAt: '2026-08-01T06:30:00Z' });
      const noti = await notiPromise;
      expect(noti.recipientId).toBe(leaderId);
      expect(noti.relatedEvent).toBeTruthy();
    } finally {
      socket.disconnect();
    }
  });
});

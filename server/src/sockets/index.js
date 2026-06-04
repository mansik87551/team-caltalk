'use strict';

/**
 * WebSocket 게이트웨이 (BE-08, NFR-03 / docs/4 §5.3 P8)
 *
 * - socket.io 를 HTTP 서버에 부착하고, 핸드셰이크 시 JWT 를 검증한다(authenticate 와 동일 로직 재사용).
 * - 도메인 이벤트 버스를 구독해 team:<teamId> 룸으로 도메인:행위 채널로 브로드캐스트한다.
 * - notification.service 에 io 를 주입해 notification:new 푸시를 활성화한다.
 * - 단일 인스턴스 룸(P8). Redis pub/sub 미도입(MVP).
 */

const { Server } = require('socket.io');

const config = require('../config');
const logger = require('../utils/logger');
const authService = require('../modules/auth/auth.service');
const { bus, EVENTS } = require('../events/domain-events');
const notificationService = require('../modules/notification/notification.service');
const { registerHandlers } = require('./handlers');

// 도메인 이벤트 → WS 채널(도메인:행위) 매핑. team:<teamId> 룸으로 브로드캐스트.
const TEAM_BROADCASTS = [
  { event: EVENTS.CHAT_MESSAGE_CREATED, channel: 'chat:message', pick: (p) => p.message },
  { event: EVENTS.SCHEDULE_CREATED, channel: 'schedule:created' },
  { event: EVENTS.SCHEDULE_UPDATED, channel: 'schedule:updated' },
  { event: EVENTS.SCHEDULE_CONFLICT_DETECTED, channel: 'schedule:conflict' },
  { event: EVENTS.SCHEDULE_CHANGE_REQUESTED, channel: 'request:created' },
  { event: EVENTS.SCHEDULE_CHANGE_APPLIED, channel: 'request:applied' },
  { event: EVENTS.SCHEDULE_CHANGE_REJECTED, channel: 'request:rejected' },
];

/** 핸드셰이크 JWT 검증 미들웨어. 무효 토큰은 연결 거부. */
function authMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    const payload = authService.verifyToken(token);
    socket.user = { userId: payload.userId, email: payload.email };
    return next();
  } catch (err) {
    return next(new Error('unauthorized'));
  }
}

/** 도메인 이벤트 버스를 구독해 팀 룸으로 브로드캐스트한다(1회 등록). */
function bridgeDomainEvents(io) {
  for (const { event, channel, pick } of TEAM_BROADCASTS) {
    bus.on(event, (payload) => {
      if (!payload || !payload.teamId) return;
      const body = pick ? pick(payload) : payload;
      io.to(`team:${payload.teamId}`).emit(channel, body);
    });
  }
}

/**
 * HTTP 서버에 socket.io 를 부착하고 초기화한다.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  });

  io.use(authMiddleware);

  io.on('connection', (socket) => {
    logger.info({ userId: socket.user.userId, socketId: socket.id }, 'socket 연결');
    registerHandlers(io, socket);
    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.user.userId, reason }, 'socket 해제');
    });
  });

  // 이벤트 버스 → 브로드캐스트 브리지, 알림 WS 푸시 활성화.
  bridgeDomainEvents(io);
  notificationService.setIo(io);

  return io;
}

module.exports = { attachSocketServer, authMiddleware };

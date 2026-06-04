'use strict';

/**
 * 소켓 연결 핸들러 (BE-08)
 *
 * - 연결 시 개인 룸(user:<userId>)과 소속 팀 룸(team:<teamId>) 에 자동 join 한다.
 * - 추가로 클라이언트가 team:join 으로 특정 팀 참여를 요청하면 Membership 을 DB 로 검증 후 join(BR-02).
 *   비멤버의 룸 참여 시도는 거부한다(룸 이름 추측 공격 방어).
 * - 재연결 시 핸드셰이크가 재인증되고 이 핸들러가 다시 실행되어 룸 재참여가 이루어진다.
 */

const teamRepository = require('../modules/team/team.repository');
const membershipRepository = require('../modules/membership/membership.repository');
const logger = require('../utils/logger');

/** 소켓이 속한 사용자의 개인 룸 + 모든 소속 팀 룸에 join 한다. */
async function joinUserRooms(socket) {
  const { userId } = socket.user;
  socket.join(`user:${userId}`);
  const teams = await teamRepository.findTeamsByUser(userId);
  for (const team of teams) {
    socket.join(`team:${team.id}`);
  }
  return teams.map((t) => t.id);
}

/** 연결당 핸들러 등록. */
function registerHandlers(io, socket) {
  joinUserRooms(socket)
    .then((teamIds) => {
      socket.emit('connection:ready', { userId: socket.user.userId, teams: teamIds });
    })
    .catch((err) => logger.warn({ err }, 'socket 룸 자동 join 실패'));

  // 명시적 팀 룸 참여(연결 이후 가입한 팀 등). Membership 검증 후 join(BR-02).
  socket.on('team:join', async (payload, ack) => {
    try {
      const teamId = payload && payload.teamId;
      if (!teamId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'teamId 필요' });
        return;
      }
      const membership = await membershipRepository.findByUserAndTeam(socket.user.userId, teamId);
      if (!membership) {
        if (typeof ack === 'function') ack({ ok: false, error: 'forbidden' });
        return;
      }
      socket.join(`team:${teamId}`);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      logger.warn({ err }, 'team:join 처리 실패');
      if (typeof ack === 'function') ack({ ok: false, error: 'error' });
    }
  });

  socket.on('team:leave', (payload, ack) => {
    const teamId = payload && payload.teamId;
    if (teamId) socket.leave(`team:${teamId}`);
    if (typeof ack === 'function') ack({ ok: true });
  });
}

module.exports = { registerHandlers, joinUserRooms };

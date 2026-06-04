'use strict';

/**
 * 채팅 서비스 (BE-09, FR-07 / BR-05 / NFR-03)
 *
 * - target_date 자동 부여(도메인 4.1): 요청에 targetDate 가 있으면 사용, 없으면 현재 UTC 날짜.
 *   created_at(불변 UTC 작성 시각)과 target_date(Daily Chat Log 그룹핑 날짜)는 분리된다.
 * - 작성 후 ChatMessageCreated 이벤트를 발행한다. BE-08 WebSocket 게이트웨이가 구독해
 *   team:<teamId> 룸으로 chat:message 를 브로드캐스트한다(NFR-03, 느슨한 결합).
 * - 팀 소속 강제(BR-02)는 라우트 미들웨어(requireMembership)가 담당한다.
 */

const { publish, EVENTS } = require('../../events/domain-events');
const chatRepository = require('./chat.repository');

/** 현재 UTC 날짜를 'YYYY-MM-DD' 로 반환(targetDate 기본값). */
function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 메시지 작성. targetDate 미지정 시 현재 UTC 날짜로 부여(도메인 4.1).
 * @returns {Promise<ChatMessage>}
 */
async function createMessage({ teamId, senderId, content, targetDate }) {
  const message = await chatRepository.create({
    teamId,
    senderId,
    content,
    targetDate: targetDate || currentUtcDate(),
  });

  // 실시간 브로드캐스트 트리거(BE-08 구독). 저장 성공 후 발행.
  publish(EVENTS.CHAT_MESSAGE_CREATED, { teamId, message });

  return message;
}

/** Daily Chat Log 조회(target_date 기준). */
async function listByDate({ teamId, date }) {
  return chatRepository.findByTeamAndDate(teamId, date);
}

module.exports = { createMessage, listByDate };

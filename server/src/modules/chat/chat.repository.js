'use strict';

/**
 * 채팅 리포지토리 (BE-09)
 *
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule).
 * - target_date 는 date 타입이라 node-pg 가 로컬 자정 Date 로 파싱하는 이슈가 있다.
 *   조회·삽입 모두 target_date::text 로 캐스팅해 YYYY-MM-DD 문자열로 주고받는다(시간대 오류 방지).
 * - snake_case → camelCase 매핑(docs/4 §3.1).
 */

const { query } = require('../../db/pool');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.message_id,
    teamId: row.team_id,
    senderId: row.sender_id,
    content: row.content,
    targetDate: row.target_date, // ::text 캐스팅으로 'YYYY-MM-DD' 문자열
    createdAt: row.created_at,
  };
}

const RETURNING =
  'message_id, team_id, sender_id, content, target_date::text AS target_date, created_at';

/**
 * 메시지 작성. target_date 는 'YYYY-MM-DD' 문자열로 바인딩한다.
 * @returns {Promise<ChatMessage>}
 */
async function create({ teamId, senderId, content, targetDate }) {
  const { rows } = await query(
    `INSERT INTO chat_messages (team_id, sender_id, content, target_date)
     VALUES ($1, $2, $3, $4::date)
     RETURNING ${RETURNING}`,
    [teamId, senderId, content, targetDate]
  );
  return mapRow(rows[0]);
}

/**
 * Daily Chat Log 조회: 팀의 특정 target_date 메시지를 created_at 순으로 반환(BR-05).
 * ix_chat_messages_team_date 인덱스 활용. 별도 테이블이 아닌 조회 관점이다(도메인 4.2).
 * @returns {Promise<Array<ChatMessage>>}
 */
async function findByTeamAndDate(teamId, date) {
  const { rows } = await query(
    `SELECT ${RETURNING}
       FROM chat_messages
      WHERE team_id = $1 AND target_date = $2::date
      ORDER BY created_at ASC`,
    [teamId, date]
  );
  return rows.map(mapRow);
}

/** messageId 로 단건 조회(BE-10 origin_message_id 검증용). 없으면 null. */
async function findById(messageId) {
  const { rows } = await query(`SELECT ${RETURNING} FROM chat_messages WHERE message_id = $1`, [
    messageId,
  ]);
  return mapRow(rows[0]);
}

module.exports = { create, findByTeamAndDate, findById, mapRow };

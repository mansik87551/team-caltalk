'use strict';

/**
 * 알림 리포지토리 (BE-11)
 *
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule).
 * - payload 는 jsonb. ix_notifications_recipient_read(recipient_id, is_read) 활용.
 * - snake_case → camelCase 매핑(docs/4 §3.1).
 */

const { query } = require('../../db/pool');

const COLUMNS = 'notification_id, recipient_id, type, related_event, payload, is_read, created_at';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.notification_id,
    recipientId: row.recipient_id,
    type: row.type,
    relatedEvent: row.related_event,
    payload: row.payload,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/** 알림 영속 저장. payload 객체는 JSON 직렬화해 jsonb 로 저장한다. */
async function create({ recipientId, type, relatedEvent, payload }) {
  const { rows } = await query(
    `INSERT INTO notifications (recipient_id, type, related_event, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING ${COLUMNS}`,
    [recipientId, type, relatedEvent, payload != null ? JSON.stringify(payload) : null]
  );
  return mapRow(rows[0]);
}

/** 수신자 알림 목록. unreadOnly 면 미읽음만(ix_notifications_recipient_read). 최신순. */
async function findByRecipient(recipientId, unreadOnly = false) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM notifications
      WHERE recipient_id = $1 AND ($2 = false OR is_read = false)
      ORDER BY created_at DESC`,
    [recipientId, unreadOnly]
  );
  return rows.map(mapRow);
}

async function findById(notificationId) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM notifications WHERE notification_id = $1`, [
    notificationId,
  ]);
  return mapRow(rows[0]);
}

/** 읽음 처리(소유자 한정). 갱신된 행을 반환, 대상 없으면 null. */
async function markRead(notificationId, recipientId) {
  const { rows } = await query(
    `UPDATE notifications SET is_read = true
      WHERE notification_id = $1 AND recipient_id = $2
      RETURNING ${COLUMNS}`,
    [notificationId, recipientId]
  );
  return mapRow(rows[0]);
}

module.exports = { create, findByRecipient, findById, markRead, mapRow };

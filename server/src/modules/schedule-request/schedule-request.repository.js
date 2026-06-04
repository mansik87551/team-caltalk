'use strict';

/**
 * 일정 변경요청(ScheduleChangeRequest) 리포지토리 (BE-10)
 *
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule).
 * - snake_case → camelCase 매핑(docs/4 §3.1). ix_scr_team_status 인덱스 활용.
 * - origin_message_id 는 NOT NULL(핵심 차별점) — Service 가 항상 채워서 전달한다.
 */

const { query } = require('../../db/pool');

const COLUMNS =
  'request_id, team_id, schedule_id, requester_id, status, request_content, origin_message_id, processed_by, processed_at, reject_reason, created_at';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.request_id,
    teamId: row.team_id,
    scheduleId: row.schedule_id,
    requesterId: row.requester_id,
    status: row.status,
    requestContent: row.request_content,
    originMessageId: row.origin_message_id,
    processedBy: row.processed_by,
    processedAt: row.processed_at,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
  };
}

/** 변경요청 생성(status=requested). origin_message_id 는 NOT NULL 로 항상 채워진다. */
async function create({ teamId, scheduleId, requesterId, requestContent, originMessageId }) {
  const { rows } = await query(
    `INSERT INTO schedule_change_requests
       (team_id, schedule_id, requester_id, request_content, origin_message_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [teamId, scheduleId, requesterId, requestContent, originMessageId]
  );
  return mapRow(rows[0]);
}

async function findById(requestId) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM schedule_change_requests WHERE request_id = $1`,
    [requestId]
  );
  return mapRow(rows[0]);
}

/** 팀 변경요청 목록. status 가 주어지면 필터(ix_scr_team_status). 최신순. */
async function findByTeam(teamId, status = null) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM schedule_change_requests
      WHERE team_id = $1 AND ($2::text IS NULL OR status = $2)
      ORDER BY created_at DESC`,
    [teamId, status]
  );
  return rows.map(mapRow);
}

/**
 * 상태 전이(applied/rejected). processed_by/processed_at(now) 기록, reject_reason 선택.
 * exec 를 주면 트랜잭션 내에서 실행한다(Applied 시 Schedule 수정과 원자 처리).
 */
async function updateStatus(requestId, { status, processedBy, rejectReason = null }, exec = query) {
  const { rows } = await exec(
    `UPDATE schedule_change_requests
        SET status = $2, processed_by = $3, processed_at = now(), reject_reason = $4
      WHERE request_id = $1
      RETURNING ${COLUMNS}`,
    [requestId, status, processedBy, rejectReason]
  );
  return mapRow(rows[0]);
}

module.exports = { create, findById, findByTeam, updateStatus, mapRow };

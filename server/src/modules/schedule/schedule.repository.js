'use strict';

/**
 * 일정 리포지토리 (BE-07)
 *
 * - 모든 SQL 은 $1, $2 파라미터라이즈드 바인딩만 사용한다(Hard Rule).
 * - snake_case → camelCase 매핑(docs/4 §3.1). ix_schedules_team_time 인덱스 활용.
 */

const { query } = require('../../db/pool');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.schedule_id,
    teamId: row.team_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  'schedule_id, team_id, title, start_at, end_at, is_all_day, created_by, created_at, updated_at';

/**
 * 기간 [from, to] 와 겹치는 팀 일정 조회(GET, 멤버 조회). ix_schedules_team_time 활용.
 * 겹침: start_at < to AND from < end_at.
 */
async function findByTeamInRange(teamId, from, to) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM schedules
      WHERE team_id = $1 AND start_at < $3 AND $2 < end_at
      ORDER BY start_at ASC`,
    [teamId, from, to]
  );
  return rows.map(mapRow);
}

/**
 * 충돌 판정 후보 조회. 후보 구간 [startAt, endAt) 와 겹치는 팀 일정을 반환한다.
 * 분 단위 절삭 경계 케이스를 놓치지 않도록 ±1분 패딩한다(정밀 판정은 domain/conflict 가 수행).
 * excludeId 가 주어지면 자기 자신을 제외한다(수정 시, AC-03).
 */
async function findConflictCandidates(teamId, startAt, endAt, excludeId = null) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM schedules
      WHERE team_id = $1
        AND ($4::uuid IS NULL OR schedule_id <> $4)
        AND start_at < ($3::timestamptz + interval '1 minute')
        AND ($2::timestamptz - interval '1 minute') < end_at
      ORDER BY start_at ASC`,
    [teamId, startAt, endAt, excludeId]
  );
  return rows.map(mapRow);
}

/** scheduleId 로 단건 조회(수정·삭제 존재/팀 확인). 없으면 null. */
async function findById(scheduleId) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM schedules WHERE schedule_id = $1`, [
    scheduleId,
  ]);
  return mapRow(rows[0]);
}

async function create({ teamId, title, startAt, endAt, isAllDay, createdBy }) {
  const { rows } = await query(
    `INSERT INTO schedules (team_id, title, start_at, end_at, is_all_day, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [teamId, title, startAt, endAt, isAllDay, createdBy]
  );
  return mapRow(rows[0]);
}

async function update(scheduleId, { title, startAt, endAt, isAllDay }) {
  const { rows } = await query(
    `UPDATE schedules
        SET title = $2, start_at = $3, end_at = $4, is_all_day = $5, updated_at = now()
      WHERE schedule_id = $1
      RETURNING ${COLUMNS}`,
    [scheduleId, title, startAt, endAt, isAllDay]
  );
  return mapRow(rows[0]);
}

/** 삭제. 삭제된 행이 있으면 true. */
async function remove(scheduleId) {
  const { rowCount } = await query(`DELETE FROM schedules WHERE schedule_id = $1`, [scheduleId]);
  return rowCount > 0;
}

module.exports = {
  findByTeamInRange,
  findConflictCandidates,
  findById,
  create,
  update,
  remove,
  mapRow,
};

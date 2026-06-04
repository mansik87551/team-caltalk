'use strict';

/**
 * 시드 데이터 스크립트 (DB-05)
 *
 * BR/AC 시나리오 재현용 일관 데이터. 고정 UUID + ON CONFLICT upsert 로 재실행 멱등.
 * 구성:
 *   - 1팀 + 팀장1·팀원1 멤버십(역할 각각, BR-10)
 *   - 충돌 검증용 일정 3건: 10:00~11:00, 경계 11:00~12:00, 종일 1건(BR-07/AC-01~03)
 *   - chat_message 1건(target_date) + 이를 origin_message_id 로 참조하는 requested SCR 1건
 *   - 비밀번호는 bcrypt 해시로만 저장(NFR-04, 평문 금지)
 *
 * 실행: npm run seed   (server/ 에서)
 */

const bcrypt = require('bcrypt');
const { pool, closePool } = require('./pool');

const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'Password123!'; // 데모 계정 공통 비밀번호(평문은 저장하지 않음)

// 고정 UUID — 멱등 upsert 식별자
const ID = {
  leader: 'a0000000-0000-0000-0000-000000000001',
  member: 'a0000000-0000-0000-0000-000000000002',
  team: 'b0000000-0000-0000-0000-000000000001',
  schedBase: 'c0000000-0000-0000-0000-000000000001', // 10:00~11:00 (충돌 기준)
  schedBoundary: 'c0000000-0000-0000-0000-000000000002', // 11:00~12:00 (경계 접촉, 비충돌)
  schedAllDay: 'c0000000-0000-0000-0000-000000000003', // 종일
  message: 'd0000000-0000-0000-0000-000000000001',
  request: 'e0000000-0000-0000-0000-000000000001',
};

// 시드 기준 날짜(달력 날짜) 및 UTC 시각
const SEED_DATE = '2026-06-10';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const [leaderHash, memberHash] = await Promise.all([
      bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS),
      bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS),
    ]);

    // 1) users (팀장·팀원) — email 기준 upsert
    await client.query(
      `INSERT INTO users (user_id, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             password_hash = EXCLUDED.password_hash,
             updated_at = now()`,
      [ID.leader, 'leader@teamcaltalk.local', '김팀장', leaderHash]
    );
    await client.query(
      `INSERT INTO users (user_id, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             password_hash = EXCLUDED.password_hash,
             updated_at = now()`,
      [ID.member, 'member@teamcaltalk.local', '이팀원', memberHash]
    );

    // 2) team — team_id 기준 upsert
    await client.query(
      `INSERT INTO teams (team_id, name)
       VALUES ($1, $2)
       ON CONFLICT (team_id) DO UPDATE
         SET name = EXCLUDED.name, updated_at = now()`,
      [ID.team, '개발팀']
    );

    // 3) memberships — (user_id, team_id) 기준 upsert, 역할 각각(BR-10)
    await client.query(
      `INSERT INTO memberships (user_id, team_id, role)
       VALUES ($1, $2, 'team_leader')
       ON CONFLICT (user_id, team_id) DO UPDATE SET role = EXCLUDED.role`,
      [ID.leader, ID.team]
    );
    await client.query(
      `INSERT INTO memberships (user_id, team_id, role)
       VALUES ($1, $2, 'team_member')
       ON CONFLICT (user_id, team_id) DO UPDATE SET role = EXCLUDED.role`,
      [ID.member, ID.team]
    );

    // 4) schedules — schedule_id 기준 upsert (작성자: 팀장, BR-03)
    //    충돌 기준 10:00~11:00, 경계 접촉 11:00~12:00(비충돌, BR-07), 종일 1건
    await client.query(
      `INSERT INTO schedules (schedule_id, team_id, title, start_at, end_at, is_all_day, created_by)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       ON CONFLICT (schedule_id) DO UPDATE
         SET title = EXCLUDED.title, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at,
             is_all_day = EXCLUDED.is_all_day, updated_at = now()`,
      [ID.schedBase, ID.team, '스프린트 회의', `${SEED_DATE}T10:00:00Z`, `${SEED_DATE}T11:00:00Z`, ID.leader]
    );
    await client.query(
      `INSERT INTO schedules (schedule_id, team_id, title, start_at, end_at, is_all_day, created_by)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       ON CONFLICT (schedule_id) DO UPDATE
         SET title = EXCLUDED.title, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at,
             is_all_day = EXCLUDED.is_all_day, updated_at = now()`,
      [ID.schedBoundary, ID.team, '코드 리뷰', `${SEED_DATE}T11:00:00Z`, `${SEED_DATE}T12:00:00Z`, ID.leader]
    );
    // 종일: 반열린 구간 [00:00, 다음날 00:00) 으로 정규화 저장(BR-07)
    await client.query(
      `INSERT INTO schedules (schedule_id, team_id, title, start_at, end_at, is_all_day, created_by)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT (schedule_id) DO UPDATE
         SET title = EXCLUDED.title, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at,
             is_all_day = EXCLUDED.is_all_day, updated_at = now()`,
      [ID.schedAllDay, ID.team, '워크샵(종일)', `${SEED_DATE}T00:00:00Z`, '2026-06-11T00:00:00Z', ID.leader]
    );

    // 5) chat_message — message_id 기준 upsert (target_date = 맥락 날짜, created_at 과 분리)
    await client.query(
      `INSERT INTO chat_messages (message_id, team_id, sender_id, content, target_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (message_id) DO UPDATE
         SET content = EXCLUDED.content, target_date = EXCLUDED.target_date`,
      [ID.message, ID.team, ID.member, '스프린트 회의를 11시로 옮길 수 있을까요?', SEED_DATE]
    );

    // 6) schedule_change_request — request_id 기준 upsert
    //    requester: 팀원(BR-04), origin_message_id: 위 메시지(핵심 차별점, NOT NULL), status: requested
    await client.query(
      `INSERT INTO schedule_change_requests
         (request_id, team_id, schedule_id, requester_id, status, request_content, origin_message_id)
       VALUES ($1, $2, $3, $4, 'requested', $5, $6)
       ON CONFLICT (request_id) DO UPDATE
         SET status = 'requested',
             request_content = EXCLUDED.request_content,
             schedule_id = EXCLUDED.schedule_id,
             requester_id = EXCLUDED.requester_id,
             origin_message_id = EXCLUDED.origin_message_id,
             processed_by = NULL, processed_at = NULL, reject_reason = NULL`,
      [ID.request, ID.team, ID.schedBase, ID.member, '스프린트 회의를 11:00로 변경 요청합니다.', ID.message]
    );

    await client.query('COMMIT');

    // 검증 요약 출력
    const { rows } = await client.query(
      `SELECT
         (SELECT count(*) FROM users)        AS users,
         (SELECT count(*) FROM teams)        AS teams,
         (SELECT count(*) FROM memberships)  AS memberships,
         (SELECT count(*) FROM schedules)    AS schedules,
         (SELECT count(*) FROM chat_messages) AS chat_messages,
         (SELECT count(*) FROM schedule_change_requests) AS change_requests`
    );
    console.log('시드 완료. 현재 행 수:', rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(closePool)
  .catch(async (err) => {
    console.error('시드 오류:', err.message);
    await closePool();
    process.exitCode = 1;
  });

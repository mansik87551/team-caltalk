-- =============================================================================
-- Team CalTalk - DB-03 검증 스크립트 (인덱스 · FK 삭제정책 · 충돌조회 인덱스 사용)
-- =============================================================================
-- 출처(SSOT) : docs/6-erd.md 4장(인덱스)·5.1(ON DELETE), docs/7-execution-plan.md DB-03
-- 목적       : (1) ERD 인덱스 전수 확인  (2) FK ON DELETE 정책 확인·동작 검증
--              (3) 충돌 조회(BR-07)가 ix_schedules_team_time 를 사용함을 EXPLAIN 으로 실증
-- 실행       : psql "$DATABASE_URL" -f database/verify-indexes.sql
--              (psql 미설치 환경은 `node server/src/db/verify-indexes.js` 사용)
-- 비고       : [3] 섹션은 대표 데이터를 트랜잭션 안에서만 적재하고 ROLLBACK 하므로
--              실제 데이터에 영향을 주지 않는다(멱등·비파괴).
-- =============================================================================


-- [1] 인덱스 목록 (\di 대체) --------------------------------------------------
--     ERD 4장: ix_memberships_team, ix_schedules_team_time, ix_chat_messages_team_date,
--     ix_chat_messages_team_created, ix_scr_team_status, ix_scr_schedule,
--     ix_scr_origin_message, ix_notifications_recipient_read (+ PK/UNIQUE 인덱스)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users','teams','memberships','schedules',
                    'chat_messages','schedule_change_requests','notifications')
ORDER BY tablename, indexname;


-- [2] FK ON DELETE 정책 (CASCADE vs RESTRICT) --------------------------------
--     팀 삭제 → CASCADE / created_by·sender_id·origin_message_id·requester_id·
--     processed_by → RESTRICT
SELECT rel.relname AS child_table,
       con.conname,
       att.attname AS fk_column,
       CASE con.confdeltype
         WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT'
         WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION'
         WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
FROM pg_constraint con
JOIN pg_class rel     ON rel.oid = con.conrelid
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
WHERE con.contype = 'f' AND rel.relnamespace = 'public'::regnamespace
ORDER BY rel.relname, con.conname;


-- [3] 대표 데이터 기반 검증 (트랜잭션 내 적재 → 검증 → ROLLBACK) ---------------
BEGIN;

-- 고정 UUID (검증용 식별자)
--   U=사용자, T=대상팀(충돌조회), S=자기 자신 일정(AC-03 제외), C=CASCADE 검증 팀
INSERT INTO users (user_id, email, display_name, password_hash)
VALUES ('11111111-1111-1111-1111-111111111111', 'verify@local', 'verify-user', 'x');

-- 셀렉티비티 확보용 벌크 팀 500개 + 팀당 일정 20건(총 10,000건)
INSERT INTO teams (team_id, name)
SELECT gen_random_uuid(), 'bulk-' || g
FROM generate_series(1, 500) g;

INSERT INTO schedules (team_id, title, start_at, end_at, created_by)
SELECT t.team_id,
       'bulk-sched',
       timestamptz '2026-01-01 00:00:00+00' + (gs * interval '1 hour'),
       timestamptz '2026-01-01 00:00:00+00' + (gs * interval '1 hour') + interval '30 minutes',
       '11111111-1111-1111-1111-111111111111'
FROM teams t
CROSS JOIN generate_series(1, 20) gs
WHERE t.name LIKE 'bulk-%';

-- 대상 팀 T: 충돌 조회 대상 (소수 행 → 인덱스 셀렉티비티 명확)
INSERT INTO teams (team_id, name)
VALUES ('22222222-2222-2222-2222-222222222222', 'target-team');

INSERT INTO schedules (schedule_id, team_id, title, start_at, end_at, created_by) VALUES
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   'self',     '2026-06-04 09:00:00+00', '2026-06-04 10:00:00+00',
   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   'overlap',  '2026-06-04 09:30:00+00', '2026-06-04 10:30:00+00',
   '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   'boundary', '2026-06-04 10:00:00+00', '2026-06-04 11:00:00+00',
   '11111111-1111-1111-1111-111111111111');

-- CASCADE 검증용 팀 C + 하위 일정/메시지
INSERT INTO teams (team_id, name)
VALUES ('44444444-4444-4444-4444-444444444444', 'cascade-team');

INSERT INTO schedules (team_id, title, start_at, end_at, created_by)
VALUES ('44444444-4444-4444-4444-444444444444', 'c-sched',
        '2026-06-04 09:00:00+00', '2026-06-04 10:00:00+00',
        '11111111-1111-1111-1111-111111111111');

INSERT INTO chat_messages (team_id, sender_id, content, target_date)
VALUES ('44444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111', 'hello', DATE '2026-06-04');

ANALYZE schedules;
ANALYZE chat_messages;

-- (3-1) 충돌 조회 EXPLAIN: 대상 팀 T, 09:00~10:00 창, 자기(S) 제외 (BR-07/AC-03)
--       기대: Index/Bitmap Scan using ix_schedules_team_time (Seq Scan 아님)
EXPLAIN (ANALYZE, BUFFERS)
SELECT schedule_id
FROM schedules
WHERE team_id = '22222222-2222-2222-2222-222222222222'
  AND start_at < timestamptz '2026-06-04 10:00:00+00'
  AND timestamptz '2026-06-04 09:00:00+00' < end_at
  AND schedule_id <> '33333333-3333-3333-3333-333333333333';

-- (3-2) FK RESTRICT: 일정 created_by 가 참조하는 사용자 삭제는 차단되어야 한다
DO $$
BEGIN
  BEGIN
    DELETE FROM users WHERE user_id = '11111111-1111-1111-1111-111111111111';
    RAISE EXCEPTION 'FAIL: created_by 참조 사용자 삭제가 차단되지 않음';
  -- RESTRICT 는 restrict_violation(23001), (참고) NO ACTION 은 foreign_key_violation(23503)
  EXCEPTION WHEN restrict_violation OR foreign_key_violation THEN
    RAISE NOTICE 'OK  [RESTRICT] created_by 참조 사용자 삭제 차단됨';
  END;
END $$;

-- (3-3) FK CASCADE: 팀 삭제 시 하위 일정·채팅 메시지가 함께 제거되어야 한다
DO $$
DECLARE s_cnt int; m_cnt int;
BEGIN
  DELETE FROM teams WHERE team_id = '44444444-4444-4444-4444-444444444444';
  SELECT count(*) INTO s_cnt FROM schedules     WHERE team_id = '44444444-4444-4444-4444-444444444444';
  SELECT count(*) INTO m_cnt FROM chat_messages WHERE team_id = '44444444-4444-4444-4444-444444444444';
  IF s_cnt = 0 AND m_cnt = 0 THEN
    RAISE NOTICE 'OK  [CASCADE] 팀 삭제 시 하위 일정/메시지 제거됨 (schedules=%, chat_messages=%)', s_cnt, m_cnt;
  ELSE
    RAISE EXCEPTION 'FAIL: 팀 삭제 후 잔존 (schedules=%, chat_messages=%)', s_cnt, m_cnt;
  END IF;
END $$;

ROLLBACK;
-- =============================================================================
-- End of verification
-- =============================================================================

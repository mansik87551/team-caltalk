-- =============================================================================
-- Team CalTalk - Database Schema (DDL)
-- =============================================================================
-- Source       : docs/6-erd.md (ERD v0.1) / docs/1-domain-definition.md (v0.2)
-- Target DBMS  : PostgreSQL 15 / 16
-- Conventions  : snake_case 테이블(복수형)/컬럼, PK=uuid(gen_random_uuid()),
--                일시=timestamptz(UTC 저장, NFR-05), 달력 날짜=date,
--                도메인 규칙(BR-06/09/10)을 CHECK/UNIQUE 제약으로 강제.
-- Note         : 모든 timestamptz 는 UTC 로 저장한다(분 단위 충돌 비교, BR-07).
--                Daily Chat Log 는 테이블이 아니라 chat_messages 의 조회 뷰다(도메인 4.2).
-- =============================================================================

-- gen_random_uuid() 사용을 위한 확장 (PostgreSQL 13+ 기본 제공, 안전 보장용)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 멱등 재생성을 위해 의존 역순으로 DROP (개발/초기화 용도)
DROP TABLE IF EXISTS notifications              CASCADE;
DROP TABLE IF EXISTS schedule_change_requests   CASCADE;
DROP TABLE IF EXISTS chat_messages              CASCADE;
DROP TABLE IF EXISTS schedules                  CASCADE;
DROP TABLE IF EXISTS memberships                CASCADE;
DROP TABLE IF EXISTS teams                      CASCADE;
DROP TABLE IF EXISTS users                      CASCADE;


-- =============================================================================
-- 1. users (DM-User)
-- =============================================================================
CREATE TABLE users (
    user_id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text        NOT NULL,
    display_name  text        NOT NULL,
    password_hash text        NOT NULL,                 -- bcrypt/argon2 해시만 저장(NFR-04, 평문 금지)
    created_at    timestamptz NOT NULL DEFAULT now(),   -- UTC
    updated_at    timestamptz NOT NULL DEFAULT now(),   -- UTC
    CONSTRAINT uq_users_email UNIQUE (email)            -- 계정 식별(FR-01)
);


-- =============================================================================
-- 2. teams (DM-Team)
-- =============================================================================
CREATE TABLE teams (
    team_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),       -- UTC
    updated_at timestamptz NOT NULL DEFAULT now()        -- UTC
);


-- =============================================================================
-- 3. memberships (DM-Membership) - User <-> Team 연결, 역할 보유
-- =============================================================================
CREATE TABLE memberships (
    membership_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL,
    team_id       uuid        NOT NULL,
    role          text        NOT NULL,                  -- team_leader / team_member
    joined_at     timestamptz NOT NULL DEFAULT now(),    -- UTC
    CONSTRAINT chk_memberships_role
        CHECK (role IN ('team_leader', 'team_member')),  -- 권한 SSOT(도메인 5장)
    CONSTRAINT uq_memberships_user_team
        UNIQUE (user_id, team_id),                       -- 한 팀 내 단일 멤버십/역할(BR-10)
    CONSTRAINT fk_memberships_user
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_memberships_team
        FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE
);


-- =============================================================================
-- 4. schedules (DM-Schedule)
-- =============================================================================
CREATE TABLE schedules (
    schedule_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     uuid        NOT NULL,
    title       text        NOT NULL,
    start_at    timestamptz NOT NULL,                    -- UTC
    end_at      timestamptz NOT NULL,                    -- UTC
    is_all_day  boolean     NOT NULL DEFAULT false,      -- 종일 여부(충돌 반열린 구간 정규화, BR-07)
    created_by  uuid        NOT NULL,                    -- 작성자(팀장, BR-03)
    created_at  timestamptz NOT NULL DEFAULT now(),      -- UTC
    updated_at  timestamptz NOT NULL DEFAULT now(),      -- UTC
    CONSTRAINT chk_schedules_time_valid
        CHECK (start_at < end_at),                       -- 일정 유효성(BR-06 / AC-04)
    CONSTRAINT fk_schedules_team
        FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE,
    CONSTRAINT fk_schedules_created_by
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
);


-- =============================================================================
-- 5. chat_messages (DM-ChatMessage)
--    target_date(맥락 날짜) 와 created_at(작성 시각) 을 분리(도메인 4.1)
-- =============================================================================
CREATE TABLE chat_messages (
    message_id  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     uuid        NOT NULL,
    sender_id   uuid        NOT NULL,
    content     text        NOT NULL,
    target_date date        NOT NULL,                    -- Daily Chat Log 그룹핑 키(BR-05)
    created_at  timestamptz NOT NULL DEFAULT now(),      -- UTC, 작성 물리 시각(불변)
    CONSTRAINT fk_chat_messages_team
        FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE RESTRICT
);


-- =============================================================================
-- 6. schedule_change_requests (DM-ScheduleChangeRequest)
--    채팅 기반 변경 요청. origin_message_id 로 근거 메시지 연결(핵심 차별점)
-- =============================================================================
CREATE TABLE schedule_change_requests (
    request_id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id           uuid        NOT NULL,
    schedule_id       uuid        NOT NULL,              -- 대상 일정
    requester_id      uuid        NOT NULL,              -- 요청자(팀원, BR-04)
    status            text        NOT NULL DEFAULT 'requested',
    request_content   text        NOT NULL,
    origin_message_id uuid        NOT NULL,              -- 변경 근거 메시지(FR-08, NOT NULL)
    processed_by      uuid,                              -- 처리자(팀장); requested 시 NULL
    processed_at      timestamptz,                       -- UTC; 처리 시각
    reject_reason     text,                              -- 반려 사유(선택, OI-7)
    created_at        timestamptz NOT NULL DEFAULT now(),-- UTC
    CONSTRAINT chk_scr_status
        CHECK (status IN ('requested', 'applied', 'rejected')),  -- 상태 전이(BR-09 / 6.2)
    CONSTRAINT fk_scr_team
        FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE,
    CONSTRAINT fk_scr_schedule
        FOREIGN KEY (schedule_id) REFERENCES schedules (schedule_id) ON DELETE CASCADE,
    CONSTRAINT fk_scr_requester
        FOREIGN KEY (requester_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_scr_origin_message
        FOREIGN KEY (origin_message_id) REFERENCES chat_messages (message_id) ON DELETE RESTRICT,
    CONSTRAINT fk_scr_processed_by
        FOREIGN KEY (processed_by) REFERENCES users (user_id) ON DELETE RESTRICT
);


-- =============================================================================
-- 7. notifications (DM-Notification)
--    도메인 이벤트(도메인 7장)로부터 생성되는 화면 내 통지
-- =============================================================================
CREATE TABLE notifications (
    notification_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    uuid        NOT NULL,
    type            text        NOT NULL,                -- conflict_warning / change_shared 등
    related_event   text        NOT NULL,                -- ScheduleConflictDetected 등(도메인 7장)
    payload         jsonb,                               -- scheduleId, requestId 등
    is_read         boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),  -- UTC, 발생시각
    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id) REFERENCES users (user_id) ON DELETE CASCADE
);


-- =============================================================================
-- 8. 인덱스 전략 (NFR-02)
--    UNIQUE 제약으로 이미 생성되는 인덱스(uq_users_email, uq_memberships_user_team)는
--    여기서 별도 생성하지 않는다.
-- =============================================================================

-- 팀별 멤버 조회
CREATE INDEX ix_memberships_team
    ON memberships (team_id);

-- 충돌 판정(BR-07)·기간 범위 조회·캘린더 뷰
CREATE INDEX ix_schedules_team_time
    ON schedules (team_id, start_at, end_at);

-- Daily Chat Log 일자별 조회(BR-05, 도메인 4.2)
CREATE INDEX ix_chat_messages_team_date
    ON chat_messages (team_id, target_date);

-- 실시간 채팅 시간순 정렬(FR-07)
CREATE INDEX ix_chat_messages_team_created
    ON chat_messages (team_id, created_at);

-- 변경요청 목록(Requested 필터, FR-09)
CREATE INDEX ix_scr_team_status
    ON schedule_change_requests (team_id, status);

-- 일정별 변경요청 추적
CREATE INDEX ix_scr_schedule
    ON schedule_change_requests (schedule_id);

-- 채팅 근거 연결 추적(핵심 차별점)
CREATE INDEX ix_scr_origin_message
    ON schedule_change_requests (origin_message_id);

-- 미읽음 알림 조회(도메인 7장)
CREATE INDEX ix_notifications_recipient_read
    ON notifications (recipient_id, is_read);


-- =============================================================================
-- 9. (선택) Daily Chat Log 조회 뷰
--    Daily Chat Log 는 별도 엔티티가 아니라 chat_messages 를 target_date 로
--    묶은 조회 관점이다(도메인 4.2). 애플리케이션에서 직접 쿼리해도 무방하며,
--    아래 뷰는 편의를 위한 선택 사항이다.
-- =============================================================================
CREATE OR REPLACE VIEW daily_chat_log AS
SELECT
    cm.team_id,
    cm.target_date,
    cm.message_id,
    cm.sender_id,
    cm.content,
    cm.created_at
FROM chat_messages cm;

-- =============================================================================
-- End of schema
-- =============================================================================

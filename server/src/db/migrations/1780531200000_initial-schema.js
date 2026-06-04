/**
 * 초기 스키마 마이그레이션 (DB-02)
 *
 * 출처(SSOT): database/schema.sql  ← docs/6-erd.md / docs/1-domain-definition.md
 * - 7개 테이블, 8개 보조 인덱스, Daily Chat Log 조회 뷰
 * - 모든 PK: uuid DEFAULT gen_random_uuid()  (pgcrypto 확장 보장)
 * - 모든 일시: timestamptz(UTC 저장, NFR-05) / 달력 날짜: date
 * - 도메인 규칙 강제: CHECK(role/status/start<end), UNIQUE(email, (user_id,team_id)) (BR-06/09/10)
 *
 * 수동 DDL 금지(구조원칙 5.3)에 따라 schema.sql 을 버전관리 마이그레이션으로 이관한다.
 * up: 의존 순서로 생성 / down: 의존 역순으로 DROP (멱등).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // gen_random_uuid() 보장용 확장 (PostgreSQL 13+ 기본 제공, 안전 보장)
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // 1. users (DM-User)
  pgm.sql(`
    CREATE TABLE users (
        user_id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        email         text        NOT NULL,
        display_name  text        NOT NULL,
        password_hash text        NOT NULL,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_users_email UNIQUE (email)
    );
  `);

  // 2. teams (DM-Team)
  pgm.sql(`
    CREATE TABLE teams (
        team_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        name       text        NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // 3. memberships (DM-Membership)
  pgm.sql(`
    CREATE TABLE memberships (
        membership_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       uuid        NOT NULL,
        team_id       uuid        NOT NULL,
        role          text        NOT NULL,
        joined_at     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_memberships_role
            CHECK (role IN ('team_leader', 'team_member')),
        CONSTRAINT uq_memberships_user_team
            UNIQUE (user_id, team_id),
        CONSTRAINT fk_memberships_user
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT fk_memberships_team
            FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE
    );
  `);

  // 4. schedules (DM-Schedule)
  pgm.sql(`
    CREATE TABLE schedules (
        schedule_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id     uuid        NOT NULL,
        title       text        NOT NULL,
        start_at    timestamptz NOT NULL,
        end_at      timestamptz NOT NULL,
        is_all_day  boolean     NOT NULL DEFAULT false,
        created_by  uuid        NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_schedules_time_valid
            CHECK (start_at < end_at),
        CONSTRAINT fk_schedules_team
            FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE,
        CONSTRAINT fk_schedules_created_by
            FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT
    );
  `);

  // 5. chat_messages (DM-ChatMessage) — target_date(맥락) 와 created_at(작성시각) 분리
  pgm.sql(`
    CREATE TABLE chat_messages (
        message_id  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id     uuid        NOT NULL,
        sender_id   uuid        NOT NULL,
        content     text        NOT NULL,
        target_date date        NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_chat_messages_team
            FOREIGN KEY (team_id) REFERENCES teams (team_id) ON DELETE CASCADE,
        CONSTRAINT fk_chat_messages_sender
            FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE RESTRICT
    );
  `);

  // 6. schedule_change_requests (DM-ScheduleChangeRequest) — origin_message_id NOT NULL(핵심 차별점)
  pgm.sql(`
    CREATE TABLE schedule_change_requests (
        request_id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id           uuid        NOT NULL,
        schedule_id       uuid        NOT NULL,
        requester_id      uuid        NOT NULL,
        status            text        NOT NULL DEFAULT 'requested',
        request_content   text        NOT NULL,
        origin_message_id uuid        NOT NULL,
        processed_by      uuid,
        processed_at      timestamptz,
        reject_reason     text,
        created_at        timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_scr_status
            CHECK (status IN ('requested', 'applied', 'rejected')),
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
  `);

  // 7. notifications (DM-Notification)
  pgm.sql(`
    CREATE TABLE notifications (
        notification_id uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id    uuid        NOT NULL,
        type            text        NOT NULL,
        related_event   text        NOT NULL,
        payload         jsonb,
        is_read         boolean     NOT NULL DEFAULT false,
        created_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_notifications_recipient
            FOREIGN KEY (recipient_id) REFERENCES users (user_id) ON DELETE CASCADE
    );
  `);

  // 8. 보조 인덱스 (NFR-02) — UNIQUE 제약이 만드는 인덱스는 제외
  pgm.sql(`CREATE INDEX ix_memberships_team           ON memberships (team_id);`);
  pgm.sql(`CREATE INDEX ix_schedules_team_time        ON schedules (team_id, start_at, end_at);`);
  pgm.sql(`CREATE INDEX ix_chat_messages_team_date    ON chat_messages (team_id, target_date);`);
  pgm.sql(`CREATE INDEX ix_chat_messages_team_created ON chat_messages (team_id, created_at);`);
  pgm.sql(`CREATE INDEX ix_scr_team_status            ON schedule_change_requests (team_id, status);`);
  pgm.sql(`CREATE INDEX ix_scr_schedule               ON schedule_change_requests (schedule_id);`);
  pgm.sql(`CREATE INDEX ix_scr_origin_message         ON schedule_change_requests (origin_message_id);`);
  pgm.sql(`CREATE INDEX ix_notifications_recipient_read ON notifications (recipient_id, is_read);`);

  // 9. Daily Chat Log 조회 뷰 (테이블 아님 — chat_messages 를 target_date 로 묶은 관점, 도메인 4.2)
  pgm.sql(`
    CREATE OR REPLACE VIEW daily_chat_log AS
    SELECT
        cm.team_id,
        cm.target_date,
        cm.message_id,
        cm.sender_id,
        cm.content,
        cm.created_at
    FROM chat_messages cm;
  `);
};

exports.down = (pgm) => {
  // 의존 역순 DROP (멱등). 인덱스는 테이블과 함께 제거된다. pgcrypto 확장은 공용이므로 유지.
  pgm.sql(`DROP VIEW  IF EXISTS daily_chat_log;`);
  pgm.sql(`DROP TABLE IF EXISTS notifications             CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS schedule_change_requests  CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS chat_messages             CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS schedules                 CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS memberships               CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS teams                     CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS users                     CASCADE;`);
};

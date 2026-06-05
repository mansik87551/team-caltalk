# Team CalTalk 실행계획 (Task 분해 & 일정)

## 0. 문서 메타데이터

| 항목 | 내용 |
|---|---|
| 제품명 | Team CalTalk |
| 문서명 | 실행계획 / Task 분해 |
| 버전 | v0.2 |
| 상태 | 구현 완료(Implemented) |
| 작성일 | 2026-06-02 (최종 갱신 2026-06-05) |
| 관련 문서 | `docs/1-domain-definition.md`, `docs/2-PRD.md`, `docs/4-project-structure-principles.md`, `docs/6-erd.md` |
| 문서 목적 | docs/ 산출물을 기반으로 데이터베이스·백엔드·프론트엔드 작업을 독립적·관리가능한 Task로 분해하고, 각 Task의 완료 조건(DoD)과 의존성, 5일 1인 MVP 일정을 정의한다. |

> 표기: 각 Task는 **ID / 목적 / 산출물 / 의존성 / 규모(S·M·L) / 완료 조건(DoD 체크박스)** 으로 구성한다. 외부 영역 의존은 `외부:` 접두로 표기한다. DoD 체크박스를 모두 만족하면 Task 완료로 간주한다.

---

## 1. 개요 & 전체 진행 체크리스트

세 영역(DB 6 + BE 12 + FE 14 = **32 Task**)으로 분해했다. 영역별 마스터 체크리스트로 진척을 추적한다.

> **진행 현황 (2026-06-05): 32개 Task 전부 구현·테스트·main 머지 완료.**
> - 백엔드: 단위+통합 테스트 **182개 통과**(BE-01~12, PR #27~#38). BE-02는 DB-01~06으로 충족되어 #8 close.
> - 프론트엔드: 컴포넌트~E2E 테스트 **69개 통과**(FE-01~14, PR #39~#52).
> - CI(GitHub Actions): 서버(Postgres+migrate+test) + 클라이언트(lint+typecheck+test+build) 게이트.
> - 로컬 Docker 전체 스택(`docker compose up`) 구성(#53). 후속 보강: 채팅 실시간 견고화(#54), 팀 참여 UI(#55).
> - 미수행: NFR-07 교차 브라우저 **수동** 검증, 클라우드 배포(로컬 Docker까지만 구성).

### 데이터베이스 (DB)
- [x] DB-01 로컬 PostgreSQL 환경 구성
- [x] DB-02 node-pg-migrate 셋업 + 초기 스키마 마이그레이션
- [x] DB-03 인덱스·FK 삭제정책 검증
- [x] DB-04 커넥션 풀(pg.Pool) 모듈 + 헬스체크
- [x] DB-05 시드 데이터 스크립트
- [x] DB-06 충돌 판정 조회(BR-07)·UTC 정합성 검증

### 백엔드 (BE)
- [x] BE-01 프로젝트 셋업 & 공통 인프라
- [x] BE-02 DB 스키마 마이그레이션 & 인덱스
- [x] BE-03 도메인 순수규칙 모듈 + 단위테스트
- [x] BE-04 인증(회원가입·로그인·JWT·bcrypt)
- [x] BE-05 인증/권한 미들웨어
- [x] BE-06 팀·멤버십 관리
- [x] BE-07 일정 CRUD + 충돌 감지·경고
- [x] BE-08 WebSocket 게이트웨이(팀 룸)
- [x] BE-09 채팅 + Daily Chat Log API
- [x] BE-10 변경요청 생성/처리 + 상태 전이
- [x] BE-11 도메인 이벤트 → Notification (Should)
- [x] BE-12 통합테스트(supertest)

### 프론트엔드 (FE)
- [x] FE-01 프로젝트 셋업 & 공통 인프라
- [x] FE-02 API 클라이언트(axios·JWT 인터셉터)
- [x] FE-03 전역 상태 스토어
- [x] FE-04 인증 화면 + 토큰 흐름
- [x] FE-05 시간대 변환 유틸(date-fns-tz)
- [x] FE-06 통합 화면 레이아웃(캘린더+채팅)
- [x] FE-07 캘린더 뷰(FullCalendar)
- [x] FE-08 일정 등록/수정 모달(팀장 한정·충돌 경고)
- [x] FE-09 채팅 패널 + Daily Chat Log
- [x] FE-10 WebSocket 클라이언트(socket.io-client)
- [x] FE-11 변경요청 생성/처리 UI(권한별 분기)
- [x] FE-12 화면 내 Notification (Should)
- [x] FE-13 권한별 UI 분기 정리
- [x] FE-14 반응형 마감 & 통합 검증

---

## 2. 데이터베이스(DB) Task

> 근거: ERD(`docs/6-erd.md`) 7개 테이블·10개 인덱스·제약(BR-06/09/10), 구조원칙 5.3·6.3(`server/src/db/`), PRD 9장(PostgreSQL 15/16, pg raw, node-pg-migrate, UTC). 기존 `database/schema.sql`(7테이블·인덱스·제약·뷰)을 마이그레이션으로 이관하는 것이 핵심.

### DB-01: 로컬 PostgreSQL 환경 구성 (Docker Compose + .env)
- **목적**: 재현 가능한 로컬 Postgres 15/16 인스턴스와 접속 설정 표준화
- **산출물**: `docker-compose.yml`, `.env.example`, `server/.env`(gitignore), `server/src/config/index.js`
- **의존성**: 없음
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] PostgreSQL 인스턴스 기동 + 연결(헬스체크) 통과 — Docker 미설치 환경이라 네이티브 **PostgreSQL 18.4** 사용, `team_caltalk` DB 생성
  - [x] `.env.example`에 `DATABASE_URL`·`POSTGRES_*`·`PORT` 키만 존재, `.env`는 `.gitignore` 포함(`git check-ignore .env` 통과)
  - [x] `SELECT 1` 성공(psql CLI 미설치 → postgresql-mcp로 동등 검증)
  - [x] 타임존 `UTC` 반환(`ALTER DATABASE team_caltalk SET timezone TO 'UTC'` 적용 후 `current_setting('TimeZone')` = `UTC`)

### DB-02: node-pg-migrate 셋업 + 초기 스키마 마이그레이션
- **목적**: 수동 DDL 금지(5.3)에 따라 `schema.sql`을 버전관리 마이그레이션으로 이관
- **산출물**: `server/package.json`(migrate 스크립트), `server/src/db/migrations/<ts>_initial-schema.js`
- **의존성**: [DB-01]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] `npm run migrate:up` 무오류 적용 + `pgmigrations` 이력 기록(`1780531200000_initial-schema`)
  - [x] 7개 테이블 생성 확인(users·teams·memberships·schedules·chat_messages·schedule_change_requests·notifications) + `daily_chat_log` 뷰
  - [x] `pgcrypto` 확장 + 7개 PK 전부 `uuid DEFAULT gen_random_uuid()`
  - [x] CHECK(chk_memberships_role / chk_scr_status / chk_schedules_time_valid: start<end), UNIQUE(uq_users_email, uq_memberships_user_team) 존재(BR-06/09/10)
  - [x] `migrate:down` 의존 역순 롤백 정상(테이블 0개·이력 삭제) → `migrate:up` 재적용 복원 확인(멱등)

### DB-03: 인덱스·FK 삭제정책 검증
- **목적**: NFR-02 복합 인덱스 10종 + ERD 5.1 ON DELETE 정책 반영·검증
- **산출물**: 인덱스·FK 마이그레이션, `database/verify-indexes.sql`
- **의존성**: [DB-02]
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] ERD 4장 인덱스 전부 확인(ix_schedules_team_time·ix_chat_messages_team_date·ix_scr_team_status 등 보조 인덱스 8종 + PK/UNIQUE) — 인덱스/FK는 DB-02 초기 마이그레이션에 정의됨, 본 단계는 검증
  - [x] FK 정책 검증: 팀 삭제 시 CASCADE, created_by/sender_id/origin_message_id/requester_id/processed_by RESTRICT 차단(카탈로그 + 동작 검증: restrict_violation 23001 차단 / 팀 CASCADE 전파 실증)
  - [x] `EXPLAIN`으로 충돌 조회가 `Index Scan using ix_schedules_team_time` 사용(Seq Scan 아님) 실증 — 산출물 `database/verify-indexes.sql` + 러너 `server/src/db/verify-indexes.js` (전체 PASS)

### DB-04: 커넥션 풀(pg.Pool) 모듈 + 헬스체크
- **목적**: NFR-02 커넥션 풀링 + 파라미터라이즈드 쿼리 진입점 단일화
- **산출물**: `server/src/db/pool.js`, `server/src/db/pool.test.js`
- **의존성**: [DB-01] (DB-02와 병렬 가능)
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] `query('SELECT 1')` 성공, `config/index.js`에서 DATABASE_URL·pool size(max/idle/conn) 주입(pool.js는 process.env 직접 참조 안 함)
  - [x] 쿼리 헬퍼 `query(text, params)`가 `$1` 바인딩만 허용 — 주입 안전 테스트로 검증(악성 문자열이 값으로만 취급), params 비배열 거부(Hard Rule)
  - [x] 세션 타임존 UTC 검증(연결 옵션 `-c timezone=UTC`, 테스트에서 `current_setting('TimeZone')`=UTC)
  - [x] `closePool()`(pool.end) graceful shutdown + `healthCheck()` 헬스 쿼리 함수 제공 — Vitest 5/5 통과(`server/src/db/pool.test.js`)

### DB-05: 시드 데이터 스크립트
- **목적**: BR/AC 시나리오 재현용 일관 시드 제공
- **산출물**: `server/src/db/seed.js`, `seed` 스크립트
- **의존성**: [DB-02, DB-04]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 1팀(개발팀) + 팀장1·팀원1 멤버십(role: team_leader / team_member, BR-10) 생성
  - [x] 충돌 검증용 일정: `10:00~11:00`(스프린트 회의) + 경계 `11:00~12:00`(코드 리뷰) + 종일 1건(`[00:00, 익일 00:00)` 정규화), 모두 UTC
  - [x] chat_message(target_date=2026-06-10) 1건 + 이를 origin_message_id 로 참조하는 requested SCR 1건(연결 검증 통과)
  - [x] 비밀번호 bcrypt(`$2b$`) 해시 저장, 고정 UUID + ON CONFLICT 로 재실행 멱등(행 수 불변)

### DB-06: 충돌 판정 조회(BR-07)·UTC 정합성 검증
- **목적**: 충돌 쿼리가 AC-01/02/03에서 정확히 반환함을 SQL 레벨에서 고정
- **산출물**: `database/queries/conflict-detection.sql`, `server/src/db/__tests__/conflict-query.test.js`
- **의존성**: [DB-02, DB-04, DB-05]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 충돌 쿼리 `(start_at < $end) AND ($start < end_at) AND team_id=$t AND schedule_id <> $self` → AC-01 충돌 1건 (`database/queries/conflict-detection.sql`)
  - [x] AC-02 경계 접촉 0건(엄격한 `<` 검증: 11:00~12:00 vs 10:00~11:00 = 0건)
  - [x] AC-03 자기 제외 0건(동일 시간이어도 self 제외 시 0건)
  - [x] 종일 일정 반열린 구간 `[00:00, 익일 00:00)` 정규화 검증(그날 일정과 충돌 / 익일 00:00 경계 비충돌)
  - [x] timestamptz UTC 라운드트립(분 단위) 검증 — 산출물 `server/src/db/__tests__/conflict-query.test.js` (Vitest 7/7 통과, 팀 격리 BR-02 보너스 포함)

### DB 영역 의존성 요약
| Task | 선행 |
|---|---|
| DB-01 | 없음 |
| DB-02 | DB-01 |
| DB-03 | DB-02 |
| DB-04 | DB-01 |
| DB-05 | DB-02, DB-04 |
| DB-06 | DB-02, DB-04, DB-05 |

**권장 착수 순서**: DB-01 → (DB-02 ∥ DB-04) → DB-03 → DB-05 → DB-06

---

## 3. 백엔드(Backend) Task

> 레이어: Routes/Sockets→Controllers→Services(+domain)→Repositories→DB. 스택: Node 20 + Express 4 / socket.io v4 / jsonwebtoken+bcrypt / zod / pg raw / pino / Vitest+supertest.

### BE-01: 프로젝트 셋업 & 공통 인프라
- **목적**: Express 골격·config·로깅·중앙 에러처리·헬스체크 (NFR-06, 5.1/5.3/6.3)
- **산출물**: `app.js`, `server.js`, `config/index.js`, `db/pool.js`, `utils/logger.js`, `utils/time.js`, `middlewares/error-handler.js`, `routes/index.js`
- **의존성**: 없음
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] `GET /health` 200 + DB 상태 반영(실패 시 503)
  - [x] config에서만 env 로딩, 필수 키 누락 시 부팅 실패
  - [x] 미들웨어 체인(CORS 화이트리스트·json·로깅·에러) 조립, 미처리 에러 표준 포맷 직렬화
  - [x] pino가 password/token redact, Vitest 스위트 실행 통과

### BE-02: DB 스키마 마이그레이션 & 인덱스
- **목적**: 7테이블·제약·인덱스 node-pg-migrate 버전 관리 (ERD, NFR-02/05, BR-06/10)
- **산출물**: `server/src/db/migrations/`, migrate 스크립트
- **의존성**: [BE-01] · 외부: [DB-02] 정합
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 7테이블 생성, timestamptz UTC, PK uuid
  - [x] CHECK(start<end / role / status), UNIQUE(email, (user_id,team_id))
  - [x] ERD 4장 인덱스 생성
  - [x] FK ON DELETE 정책 적용, migrate up/down 무오류

### BE-03: 도메인 순수규칙 모듈 + 단위테스트
- **목적**: BR-06/07/09·권한을 순수 함수로 분리 + AC-01~08 단위테스트 (P7)
- **산출물**: `domain/conflict.js`, `schedule-validation.js`, `change-request-state.js`, `permissions.js` + `tests/unit/*`
- **의존성**: [BE-01]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] `detectConflict` AC-01 true, 경계 AC-02 false(`<` not `≤`)
  - [x] 자기 제외 AC-03, 종일 반열린 구간 정규화
  - [x] `validateSchedule` AC-04 거부
  - [x] `canTransition` AC-07/08, `can(role,action)` AC-05
  - [x] 테스트명에 BR/AC ID 포함, 전부 통과

### BE-04: 인증 (회원가입·로그인·JWT·bcrypt)
- **목적**: FR-01 인증, bcrypt 해시·JWT 발급 (BR-01, NFR-04, OI-4 액세스 단독)
- **산출물**: `modules/auth/*` + zod 스키마
- **의존성**: [BE-01, BE-02]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] `POST /api/auth/signup` 201, bcrypt 해시, 중복 409
  - [x] `POST /api/auth/login` 200 + JWT(만료 TTL)
  - [x] 불일치/미존재 401, 검증 실패 400
  - [x] 응답·로그에 해시·평문 미노출

### BE-05: 인증/권한 미들웨어
- **목적**: JWT 검증·팀 소속·역할 강제 (BR-01/02/03, AC-05/06, 5.2 Hard Rule)
- **산출물**: `middlewares/authenticate.js`, `authorize.js`, `validate.js`
- **의존성**: [BE-03, BE-04]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 무토큰·잘못된 토큰 401(AC-06)
  - [x] 비멤버 403, teamId+Membership 타팀 격리(BR-02)
  - [x] 팀원 일정 CUD 403, Service 진입 전 차단(BR-03/AC-05)
  - [x] validate 스키마 위반 400, 권한 분기 한 곳 집중

### BE-06: 팀·멤버십 관리
- **목적**: FR-02 팀 생성·멤버십·역할 (BR-02/10, OI-1/2)
- **산출물**: `modules/team/*` + zod
- **의존성**: [BE-05]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] `POST /api/teams` 201, 생성자 team_leader 자동 부여(OI-2)
  - [x] 가입 시 team_member 생성, UNIQUE 위반 409(BR-10)
  - [x] `GET .../members` 멤버 한정 조회(BR-02)
  - [x] 다중 팀 소속·각 팀 단일 역할 유지

### BE-07: 일정 CRUD + 충돌 감지·경고
- **목적**: FR-03~06 Schedule 조회/등록/수정/삭제·충돌 경고 (BR-03/06/07/08, AC-01~05)
- **산출물**: `modules/schedule/*` + zod
- **의존성**: [BE-05, BE-03, BE-06]
- **규모**: L
- **완료 조건 (DoD)**:
  - [x] `GET .../schedules?from&to` 멤버 조회(인덱스 활용)
  - [x] `POST` 팀장 한정(AC-05), 유효성 400(AC-04), conflict 호출
  - [x] 충돌 시에도 저장 201 + `conflicts[]` 경고(BR-08), 자기 제외(AC-03)
  - [x] `PUT`/`DELETE` 팀장 한정, DB CHECK+앱 검증 이중
  - [x] `ScheduleCreated/Updated/ConflictDetected` 이벤트 발행

### BE-08: WebSocket 게이트웨이 (팀 룸 + JWT 핸드셰이크)
- **목적**: socket.io 팀 룸·핸드셰이크 인증 (NFR-03, 5.2, P8)
- **산출물**: `sockets/index.js`, `sockets/handlers.js`, server.js 부착
- **의존성**: [BE-04, BE-05]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] WS 핸드셰이크 JWT 검증, 무효 토큰 거부
  - [x] 멤버인 `team:<id>` 룸만 join, 비멤버 거부(BR-02)
  - [x] 룸 단위 브로드캐스트, 도메인:행위 채널 네이밍
  - [x] 재연결 동작, 단일 인스턴스 룸(Redis 미도입)

### BE-09: 채팅 + Daily Chat Log API
- **목적**: FR-07 ChatMessage 작성/조회·일자별 이력·실시간 (BR-05, NFR-03)
- **산출물**: `modules/chat/*` + WS chat:message 연동
- **의존성**: [BE-08, BE-06]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 작성 시 target_date 자동 부여(도메인 4.1)
  - [x] `GET .../chat?date=` Daily Chat Log 조회(인덱스 활용)
  - [x] 작성 시 팀 룸 chat:message 브로드캐스트(NFR-03)
  - [x] created_at(불변 UTC)·target_date 분리, 비멤버 403

### BE-10: 변경요청 생성/처리 + 상태 전이
- **목적**: FR-08/09 SCR 생성·Applied/Rejected (BR-04/09, AC-07/08)
- **산출물**: `modules/schedule-request/*` + zod
- **의존성**: [BE-07, BE-09]
- **규모**: L
- **완료 조건 (DoD)**:
  - [x] `POST .../schedule-change-requests` → requested, origin_message_id NOT NULL 연결
  - [x] `GET ...?status=requested` 목록(인덱스)
  - [x] `PATCH .../:id` 팀장 applied/rejected, processed_* 기록, Applied 시 Schedule 반영(AC-07)
  - [x] 종결 재전이 409, 팀원 처리 403(AC-08); SCR 이벤트 발행

### BE-11: 도메인 이벤트 → Notification (Should)
- **목적**: 이벤트로부터 Notification 생성·전달 (도메인 7장)
- **산출물**: `events/domain-events.js`, `modules/notification/notification.service.js`
- **의존성**: [BE-07, BE-08, BE-10]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] ConflictDetected→팀장, Updated→팀원, Requested→팀장, Applied/Rejected→요청자
  - [x] Notification 영속 저장 + WS 푸시
  - [x] `GET /api/notifications?unread=true`(인덱스)
  - [x] 이벤트 디스패치 Service 일원화

### BE-12: 통합테스트 (supertest)
- **목적**: 인증·권한·핵심 플로우 API 검증 (AC-05/06/07, BR-01/02/03)
- **산출물**: `tests/integration/*`
- **의존성**: [BE-04, BE-06, BE-07, BE-10]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 무토큰·비멤버 차단(AC-06), 팀원 CUD 403(AC-05)
  - [x] 충돌 등록 201+경고(AC-01/02), 유효성 400(AC-04)
  - [x] Requested→Applied + 종결 재전이 거부(AC-07/08)
  - [x] 테스트명 BR/AC ID 포함, CI 게이트 통과

### 백엔드 영역 의존성 요약
| Task | 의존성 | 규모 | 우선순위 |
|---|---|:---:|:---:|
| BE-01 | 없음 | M | Must |
| BE-02 | BE-01 | M | Must |
| BE-03 | BE-01 | M | Must |
| BE-04 | BE-01, BE-02 | M | Must |
| BE-05 | BE-03, BE-04 | M | Must |
| BE-06 | BE-05 | M | Must |
| BE-07 | BE-05, BE-03, BE-06 | L | Must |
| BE-08 | BE-04, BE-05 | M | Must |
| BE-09 | BE-08, BE-06 | M | Must |
| BE-10 | BE-07, BE-09 | L | Must |
| BE-11 | BE-07, BE-08, BE-10 | M | Should |
| BE-12 | BE-04, BE-06, BE-07, BE-10 | M | Must |

**권장 착수 순서**: BE-01 → BE-02 → BE-03(병행) → BE-04 → BE-05 → BE-06 → BE-07 → BE-08 → BE-09 → BE-10 → BE-11 → BE-12

---

## 4. 프론트엔드(Frontend) Task

> React 18 + Vite 5 + TS, Feature-First(6.4), 권한 매트릭스 UX 노출 제어(강제는 서버). `[Mock]` = 백엔드 미완 시 MSW/로컬 mock으로 병렬 진행 가능.

### FE-01: 프로젝트 셋업 & 공통 인프라
- **목적**: Vite/TS/Tailwind/라우터/Query/Zustand/ESLint·Prettier 토대 (NFR-08, 6.4/6.5)
- **산출물**: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `main.tsx`, `App.tsx`, `styles/`, `.env.example`
- **의존성**: 없음
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] `npm run dev` HMR로 빈 셸 렌더
  - [x] 라우트(`/login`, `/`) + 미인증 리다이렉트 가드 자리
  - [x] QueryClientProvider + Tailwind 적용
  - [x] ESLint+Prettier 통과, tsconfig strict

### FE-02: API 클라이언트 레이어 (axios + JWT 인터셉터)
- **목적**: REST 캡슐화·JWT 주입·에러 표준화 (6.4, 5.2)
- **산출물**: `api/client.ts`, `api/endpoints/*`, `api/types.ts`
- **의존성**: [FE-01] · 외부: (전반) `[Mock]`
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] 모든 요청에 토큰 자동 첨부
  - [x] 401 시 토큰 폐기 후 `/login`
  - [x] 서버 표준 에러 정규화 throw
  - [x] MSW/baseURL 교체로 mock 검증

### FE-03: 전역 상태 스토어 (인증·선택 날짜·팀 컨텍스트)
- **목적**: 인증·selectedDate(targetDate 단일출처)·팀/역할 Zustand 관리 (UC-01/06)
- **산출물**: `store/authStore.ts`, `store/uiStore.ts`, `hooks/useAuth.ts`, `hooks/useCurrentTeam.ts`
- **의존성**: [FE-01]
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] 로그인 시 token·user·role 저장 + 새로고침 복원(localStorage)
  - [x] selectedDate 전역 구독으로 캘린더↔채팅 동기화
  - [x] currentTeamId·역할 노출(권한 UI 기준)
  - [x] logout 시 전체 초기화

### FE-04: 인증 화면 + 토큰 흐름
- **목적**: 회원가입·로그인 UI·토큰 수령·진입 (FR-01/02, UC-01, SC-01)
- **산출물**: `pages/LoginPage.tsx`, `features/auth/*`, `RequireAuth.tsx`
- **의존성**: [FE-02, FE-03] · 외부: BE-04 `[Mock]`
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 회원가입 성공 시 자동 로그인·토큰 저장·진입
  - [x] 로그인 성공 시 TeamWorkspacePage 이동(SC-01)
  - [x] 미인증 보호 라우트 접근 차단(BR-01/AC-06)
  - [x] zod 검증·서버 에러 폼 표시

### FE-05: 시간대 변환 유틸 (date-fns-tz, UTC↔KST)
- **목적**: 표시 전용 UTC↔로컬 변환 단일화 (NFR-05, 6.4 lib/datetime.ts)
- **산출물**: `lib/datetime.ts`, `datetime.test.ts`
- **의존성**: [FE-01]
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] UTC→KST 정확 변환(05:00Z→14:00)
  - [x] 로컬 입력→UTC ISO 변환 전송
  - [x] selectedDate→targetDate(YYYY-MM-DD) 로컬 산출
  - [x] 변환 로직이 이 모듈에만 존재

### FE-06: 통합 화면 레이아웃 (캘린더+채팅 셸)
- **목적**: 상단 팀·날짜 / 좌·중 캘린더 / 우 채팅 골격 (PRD 10장, UC-06, NFR-08)
- **산출물**: `pages/TeamWorkspacePage.tsx`, `features/team/TeamSwitcher.tsx`, `components/*`
- **의존성**: [FE-03, FE-04]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 한 화면에 캘린더+채팅 동시 배치(슬롯)
  - [x] 팀 전환 시 currentTeamId 갱신·하위 리렌더
  - [x] ≥1024px 2열, 좁은 폭 세로 스택(NFR-08)
  - [x] 헤더에 사용자·역할·로그아웃

### FE-07: 캘린더 뷰 (FullCalendar 월/주/일 + 날짜 선택)
- **목적**: 일정 조회·날짜 선택→selectedDate 갱신 (FR-03, UC-03/06, SC-04)
- **산출물**: `features/calendar/CalendarView.tsx`, `useSchedules.ts`, event 매퍼
- **의존성**: [FE-05, FE-06] · 외부: BE-07 `[Mock]`
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 월/일(Must)·주(Should) 뷰 KST 표시
  - [x] 날짜 클릭 시 selectedDate 갱신→채팅 동기화(UC-06)
  - [x] 팀 전환·변경 시 Query 무효화 자동 갱신
  - [x] 종일 일정 종일 영역 렌더

### FE-08: 일정 등록/수정 모달 (팀장 한정 + 충돌 경고)
- **목적**: 팀장 Schedule CRUD·유효성·충돌 경고 (FR-04/05/06, UC-02, SC-02/03, BR-03/06/07/08)
- **산출물**: `features/schedule/ScheduleModal.tsx`, `scheduleSchema.ts`, `useScheduleMutations.ts`
- **의존성**: [FE-05, FE-07] · 외부: BE-07 `[Mock]`
- **규모**: L
- **완료 조건 (DoD)**:
  - [x] 팀원에게 추가/수정/삭제 UI 미노출(BR-03)
  - [x] start==end / end<start 클라이언트 거부(AC-04/EX-03)
  - [x] 저장 성공 시 모달 닫힘·캘린더 무효화 반영(SC-02)
  - [x] 서버 충돌 반환 시 저장 유지+경고 표시(BR-08/SC-03)
  - [x] 로컬→UTC 변환(FE-05) 후 전송

### FE-09: 채팅 패널 + Daily Chat Log (targetDate 동기화)
- **목적**: 선택 날짜 기준 일자별 채팅 조회·작성 (FR-07, UC-06, SC-04, BR-05)
- **산출물**: `features/chat/ChatPanel.tsx`, `useDailyChatLog.ts`, `MessageList/Input.tsx`
- **의존성**: [FE-03, FE-05, FE-06] · 외부: BE-09 `[Mock]`
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 날짜 선택 시 해당 targetDate Daily Chat Log 동기화(SC-04)
  - [x] 전송 시 selectedDate가 targetDate로 부여(도메인 4.1)
  - [x] createdAt KST 표시, targetDate≠createdAt 구분
  - [x] 며칠 뒤 같은 날짜 재조회 시 대화 보존(BR-05)

### FE-10: WebSocket 클라이언트 (socket.io-client)
- **목적**: 팀 룸 실시간 수신·반영 (NFR-03, SC-02/04/05)
- **산출물**: `api/socket.ts`, `hooks/useSocket.ts`, 이벤트→Query 무효화
- **의존성**: [FE-02, FE-03, FE-07, FE-09] · 외부: BE-08 `[Mock]`
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] 로그인·팀 진입 시 JWT 핸드셰이크·룸 join
  - [x] 타 사용자 메시지 1초 내 반영(NFR-03)
  - [x] 일정 이벤트 수신 시 캘린더 자동 갱신
  - [x] 팀 전환 룸 leave/join, 끊김 시 재연결

### FE-11: 변경요청 생성/처리 UI (권한별 분기)
- **목적**: 팀원 요청 생성·팀장 Applied/Rejected (FR-08/09, UC-04/05, SC-05/06, BR-04/09)
- **산출물**: `features/schedule-request/CreateChangeRequest.tsx`, `RequestProcessPanel.tsx`, `useChangeRequests.ts`
- **의존성**: [FE-08, FE-09] · 외부: BE-10 `[Mock]`
- **규모**: L
- **완료 조건 (DoD)**:
  - [x] 팀원 [변경 요청]만, 처리 버튼 미노출(BR-04)
  - [x] 생성 시 채팅 메시지 기록·originMessageId 연결(SC-05)
  - [x] 팀장 Requested 목록·원본 채팅 링크 확인(SC-05)
  - [x] Applied 시 팀 반영, Rejected 시 불변·사유 표시(SC-05/06/AC-07)
  - [x] 종결 요청 처리 버튼 비활성(AC-08/EX-05)

### FE-12: 화면 내 Notification (Should)
- **목적**: 충돌·변경·요청 통지 표시 (PRD 7장, 도메인 7장, SC-03/05/06)
- **산출물**: `features/notification/*`, `store/notificationStore.ts`
- **의존성**: [FE-08, FE-10, FE-11]
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] 충돌 감지 시 경고 토스트(SC-03)
  - [x] 요청 생성·Applied·Rejected 통지(SC-05/06)
  - [x] 중복 없이 누적·해제, 세션 동안 확인(OI-5)

### FE-13: 권한별 UI 분기 정리 (팀장 vs 팀원)
- **목적**: 역할 기반 노출 제어 공통 가드 일관화 (도메인 5장, BR-03/04, 2.3)
- **산출물**: `features/auth/useRole.ts`, `RoleGate.tsx`, 액션 래핑 리팩터
- **의존성**: [FE-08, FE-11]
- **규모**: S
- **완료 조건 (DoD)**:
  - [x] 팀원 통제 UI 일관 숨김(SC-01/AC-05 UX)
  - [x] 팀장 모든 통제 액션 노출
  - [x] 권한 분기 RoleGate 한 곳 집중(중복 없음)

### FE-14: 반응형 마감 & 통합 검증
- **목적**: 반응형 마감·핵심 시나리오 수동 검증·버그픽스 (NFR-07/08, Day5)
- **산출물**: 반응형 보정, 검증 체크리스트, `React.lazy` 스플리팅
- **의존성**: [FE-06]~[FE-13]
- **규모**: M
- **완료 조건 (DoD)**:
  - [x] <1024px 캘린더·채팅·모달 붕괴 없음(NFR-08) — 2열↔세로 스택, 모달 `max-h-[90vh]` 스크롤 보정
  - [ ] 4개 브라우저 최신 2버전 동작(NFR-07) — **수동 검증 항목**(docs/9 체크리스트 제공, 실제 교차 브라우저 실행은 미수행)
  - [x] SC-01~06 해피패스 end-to-end 통과 — 핵심 흐름 자동 E2E(`client/src/pages/workspace.e2e.test.tsx`) + docs/9 체크리스트(나머지 수동)
  - [x] React.lazy 번들 분리(TeamWorkspacePage 별도 청크)

### 프론트엔드 영역 의존성 요약
| Task | 프론트 의존 | 외부(BE) | 규모 | Mock |
|---|---|---|:---:|:---:|
| FE-01 | 없음 | — | S | — |
| FE-02 | FE-01 | (전반) | S | O |
| FE-03 | FE-01 | — | S | — |
| FE-04 | FE-02, FE-03 | BE-04 | M | O |
| FE-05 | FE-01 | — | S | — |
| FE-06 | FE-03, FE-04 | — | M | — |
| FE-07 | FE-05, FE-06 | BE-07 | M | O |
| FE-08 | FE-05, FE-07 | BE-07 | L | O |
| FE-09 | FE-03, FE-05, FE-06 | BE-09 | M | O |
| FE-10 | FE-02, FE-03, FE-07, FE-09 | BE-08 | M | O |
| FE-11 | FE-08, FE-09 | BE-10 | L | O |
| FE-12 | FE-08, FE-10, FE-11 | — | S | — |
| FE-13 | FE-08, FE-11 | — | S | — |
| FE-14 | FE-06~FE-13 | — | M | — |

**권장 착수 순서**: FE-01 → (FE-02·FE-03·FE-05 병렬) → FE-04 → FE-06 → FE-07 → (FE-08·FE-09 병렬) → FE-10 → FE-11 → (FE-12·FE-13 병렬) → FE-14

---

## 5. 교차 영역 의존성 (Cross-Layer)

핵심 계약(Contract) 의존만 표기한다. 프론트는 `[Mock]` Task로 백엔드 선행 없이 병렬 착수 가능하며, 실제 결선은 아래 시점에 이루어진다.

| 프론트 Task | 의존 백엔드 계약 | 선행 DB |
|---|---|---|
| FE-04 인증 | BE-04 (auth API) | BE-02 ← DB-02 |
| FE-07 캘린더 | BE-07 (일정 조회 API) | DB-02, DB-06 |
| FE-08 일정 모달 | BE-07 (CRUD·충돌 응답) | DB-06 |
| FE-09 채팅 | BE-09 (채팅·Daily Chat Log) | DB-02 |
| FE-10 WebSocket | BE-08 (socket.io 룸) | — |
| FE-11 변경요청 | BE-10 (SCR API) | DB-02 |

```
DB-01 ─ DB-02 ─ DB-03
   └ DB-04 ─ DB-05 ─ DB-06
        │
        ▼ (스키마/풀 정합)
BE-01 ─ BE-02 ─ BE-04 ─ BE-05 ─ BE-06 ─ BE-07 ─ BE-08 ─ BE-09 ─ BE-10 ─ BE-12
   └ BE-03 ──────────┘                                  └ BE-11
        │ (API/WS 계약)
        ▼
FE-01 ─ FE-02/03/05 ─ FE-04 ─ FE-06 ─ FE-07 ─ FE-08/09 ─ FE-10 ─ FE-11 ─ FE-14
```

---

## 6. 5일 일정 매핑 (PRD 11장 정합)

1인 개발 기준, 같은 날 내 DB→BE→FE 순으로 수직 통합한다. 프론트 `[Mock]` Task로 대기시간을 줄인다.

| Day | DB | BE | FE | 목표 |
|---|---|---|---|---|
| **Day 1** | DB-01, DB-02, DB-04 | BE-01, BE-02, BE-03 | FE-01, FE-02, FE-03, FE-05 | 기반·스키마·인증 토대·도메인 규칙 단위테스트 |
| **Day 2** | DB-03, DB-05 | BE-04, BE-05, BE-06 | FE-04, FE-06 | 인증/권한·팀·로그인 화면·통합 레이아웃 |
| **Day 3** | DB-06 | BE-07, BE-08 | FE-07, FE-08 | 일정 CRUD·충돌·WebSocket·캘린더·일정 모달 |
| **Day 4** | — | BE-09, BE-10, BE-11 | FE-09, FE-10, FE-11 | 채팅·변경요청·실시간 결선·Notification |
| **Day 5** | — | BE-12 | FE-12, FE-13, FE-14 | 통합테스트·권한분기·반응형·SC 검증·버그픽스 |

> **리스크 대응**: 지연 시 Should 항목(BE-11/FE-12 Notification 고도화, 주 뷰, 반려 사유)을 우선 축소(PRD 11·12장). 보안 Hard Rule(권한 강제·bcrypt·파라미터라이즈드·UTC)과 충돌 판정 단위테스트(AC-01~03)는 축소 불가.

---

## 7. 완료 기준 (Definition of Done, 전체)

전체 MVP는 다음을 모두 만족할 때 완료로 간주한다.

- [x] DB 6개, BE 12개, FE 14개 Task의 DoD 충족 (예외: FE-14 NFR-07 교차 브라우저 **수동** 검증 1건 미수행 — 체크리스트 제공)
- [x] 핵심 수용 기준 AC-01~AC-08 자동/수동 검증 통과 (도메인 단위 + supertest 통합 테스트)
- [x] 사용자 시나리오 SC-01~SC-06 해피패스 동작 (핵심 자동 E2E + docs/9 체크리스트)
- [x] 보안 Hard Rule(서버측 권한 강제·bcrypt 해시·파라미터라이즈드 쿼리·UTC 저장) 준수 확인
- [x] CI 최소 게이트(lint + 테스트) 통과 (GitHub Actions: server + client)

> 비고: 배포는 **로컬 Docker 전체 스택**(`docker compose up`)까지 구성(docs/10). 클라우드 배포(공개 URL)는 범위 외.

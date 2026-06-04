# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 가이드를 제공합니다.

## 주요 지침 (최우선)

1. **모든 처리 결과에 대한 설명은 한국어로 작성한다.** 분석, 요약, 변경 사항 설명, 오류 보고 등 사용자에게 전달하는 모든 설명은 한국어를 사용한다.
2. **오버엔지니어링 금지.** 5일 1인 MVP 제약(원칙 P2) 하에서 가장 단순하게 동작하는 방안을 택한다. 미래를 위한 추측성 추상화, 불필요한 계층·설정·라이브러리 도입을 금지한다. 검증된 라이브러리를 활용해 자체 구현을 최소화한다.

---

## 프로젝트 상태: 명세 우선(spec-first), 구현 이전 단계

Team CalTalk은 팀 일정 관리 + 채팅 앱이다. **애플리케이션(`client/`, `server/`)은 아직 구현되지 않았다.** 현재 존재하는 것은 설계 및 계약(contract) 계층이다:

- `docs/` — 설계 명세서(도메인, PRD, 시나리오, 구조 원칙, 아키텍처, ERD, 실행계획, 와이어프레임). **이것이 단일 출처(SSOT, Single Source of Truth)다.**
- `swagger/swagger.json` — OpenAPI 3.0.3 계약. `docs/`로부터 도출되었고 그와 일관성이 유지된다.
- `database/schema.sql` — PostgreSQL DDL(7개 테이블, 인덱스, 제약, Daily Chat Log 뷰). `docs/6-erd.md`로부터 도출됨. 아직 마이그레이션 도구에 연결되지 않았다.
- `mockup/` — 유일하게 실행 가능한 코드. `swagger/swagger.json`을 직접 읽어 mock API + Swagger UI를 제공하는 Express 서버다.

실제 앱을 구현할 때는 `docs/4-project-structure-principles.md` §6의 계획된 구조(`client/` React SPA + `server/` Express API, 기능 우선 모듈)와 `docs/7-execution-plan.md`의 작업 분해 / 5일 계획(DB-01…06, BE-01…12, FE-01…14)을 따른다.

## SSOT 우선순위 — 모순은 이 순서로 해소한다

1. `docs/1-domain-definition.md` — 도메인 개념, **권한 매트릭스(§5)**, 비즈니스 규칙 **BR-01…BR-10**, 상태 전이, 수용 기준 **AC-01…AC-08**. 권한 매트릭스와 BR이 명시적인 SSOT다.
2. `docs/4-project-structure-principles.md` — 네이밍, 레이어링, 보안 규칙, 기술 스택.
3. `swagger/swagger.json` 및 `database/schema.sql` — 위 문서를 따라야 한다. `docs/`와 충돌하면 문서가 우선이며 명세/DDL을 수정한다(그 반대가 아님).

코드·테스트·커밋의 모든 BR/FR/UC/AC ID는 이 문서들로 추적 가능해야 한다(원칙 P5). 테스트명에는 ID를 포함한다. 예: `detectConflict: returns false on boundary touch (BR-07/AC-02)`.

## 명령어

저장소에는 아직 빌드/린트/테스트 구성이 없다. 실행 가능한 유일한 구성요소는 mock 서버다:

```powershell
cd mockup
node server.js          # http://localhost:3000 에 mock API + Swagger UI 제공
# /docs  -> Swagger UI ;  /api/... -> swagger.json 기반 mock 응답
```

`mockup/server.js`는 `../swagger/swagger.json`을 **프로세스 cwd 기준**으로 해석하므로 반드시 `mockup/` 안에서 실행한다. `nodemon`은 설치되어 있으나 npm 스크립트는 정의되지 않았다. 자동 리로드는 `npx nodemon server.js`를 사용한다.

실제 server/client를 스캐폴딩할 때의 계획된 스택(`docs/4` §6.5 및 PRD §9 기준):
- **백엔드**: Node 20 + Express 4, socket.io v4, jsonwebtoken + bcrypt, zod, `pg`(raw, **ORM 미사용**) + node-pg-migrate, pino, Vitest + supertest.
- **프론트엔드**: React 18 + Vite 5 + TypeScript, TanStack Query v5, Zustand, axios, react-hook-form + zod, Tailwind, FullCalendar, date-fns + date-fns-tz, socket.io-client.
- CI 최소 게이트는 `lint + 단위 테스트`다.

## 아키텍처 불변식 (여러 파일에 걸쳐 있어 실수하기 쉬움)

다음 항목들은 여러 파일에 걸쳐 있으며, 코딩 전에 docs를 읽어야 하는 이유다:

- **백엔드 레이어링은 단방향이다**: Routes/Sockets → Controllers → Services(+ 순수 `domain/`) → Repositories → DB. 비즈니스 규칙은 오직 Services/Domain에만 존재한다. `domain/` 함수는 순수 함수다(I/O 없음, `Date.now()` 금지 — 현재 시각은 주입받는다). 그래야 단위 테스트가 저렴하다. BR을 Controller나 Repository에서 재구현하지 말 것.

- **충돌 판정(BR-07)**은 `domain/conflict.js`, SQL 쿼리, 테스트에 반복되는 정밀한 의미를 가진다: 겹침은 `A.startAt < B.endAt AND B.startAt < A.endAt`(엄격한 `<`, 따라서 경계 접촉 `A.endAt == B.startAt`은 충돌이 아님). **UTC 분(minute) 단위**로 비교하고, 자기 자신과의 비교는 제외하며, 종일 일정은 `[00:00, 다음날 00:00)`으로 정규화한다. 충돌은 **차단이 아니라 저장**된다(BR-08) — API는 일정과 함께 `conflicts[]` 경고 배열을 반환한다.

- **권한은 서버측에서만 강제된다**(BR-01/02/03). 권한 매트릭스는 `docs/1` §5에 있다: 일정 생성/수정/삭제는 team_leader 한정이며, 모든 기능은 인증 + 팀 소속을 요구한다. 프론트엔드의 역할 기반 노출 제어는 UX 편의일 뿐, 강제가 아니다. 역할은 `team_leader` / `team_member`이며, 사용자는 한 팀에서 하나의 역할만 가진다(BR-10).

- **핵심 차별점 — `ScheduleChangeRequest.origin_message_id`는 NOT NULL이다**: 모든 변경요청은 ChatMessage를 매개로 발생하여 "왜 바뀌었는가"를 보존한다. 요청은 기존 메시지를 참조하거나, 서버가 `content`로부터 메시지를 생성한다. 어느 경로든 이 연결은 항상 채워진다. 상태 흐름: `requested → applied | rejected`. 종결 상태는 재전이를 거부한다(BR-09, 409 반환).

- **모든 일시는 UTC로 저장**된다(`timestamptz`). `start_at`/`end_at`/`created_at`은 UTC 시점이고, `target_date`는 달력 날짜다(Daily Chat Log 그룹핑 키이며 `created_at`과 구분됨). 시간대 변환은 오직 프론트엔드 표시 계층(`client/src/lib/datetime.ts`)에서만 일어난다. 이것은 Hard Rule이다.

- **Daily Chat Log는 테이블이 아니라 조회 뷰다** — 별도 엔티티가 아니라 `chat_messages`를 `target_date`로 그룹핑한 것이다.

## 컨벤션

- **DB는 snake_case, REST 요청/응답은 camelCase**다(`docs/4` §3.1). Repository 계층이 둘 사이를 매핑한다 — `snake_case` 컬럼명을 API 응답에 노출하지 말 것.
- 정규 도메인 명칭을 일관되게 사용한다: `Schedule`, `ScheduleChangeRequest`, `ChatMessage`, `DailyChatLog`, `Membership`, `Notification`. 변형 표현("event", 단독 "request", "팀 일정 항목")을 피한다.
- 표준 에러 형식: `{ error: { code, message } }`, 상태코드 매핑은 400 검증 / 401 인증 / 403 권한 / 404 / 409 충돌·상태전이 위반.
- 폴더/파일 네이밍: kebab-case 폴더 + 역할 접미사(`schedule.service.js`, `conflict.domain.js`); PascalCase React 컴포넌트; `useXxx` 훅.

## Hard Rules (예외 없음, `docs/4` §7.2 기준)

서버측 권한 강제, bcrypt/argon2 비밀번호 해시(평문 절대 금지), 파라미터라이즈드 쿼리만 사용(문자열 연결 SQL 금지), UTC 저장. 충돌 판정 단위 테스트(AC-01/02/03)도 타협 불가다. 이들은 단순성을 이유로 생략할 수 없다.

## 참조 저장소

`awesome-claude-code-subagents/`는 참조용으로 클론한 무관한 저장소다(자체 `.git` 보유). gitignore 처리되어 있으며 이 프로젝트의 일부가 아니다.

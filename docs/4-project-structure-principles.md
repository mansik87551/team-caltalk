# Team CalTalk 프로젝트 구조 설계 원칙

## 0. 문서 메타데이터

| 항목 | 내용 |
|---|---|
| 제품명 | Team CalTalk |
| 문서명 | 프로젝트 구조 설계 원칙 |
| 버전 | v0.1 |
| 상태 | Draft |
| 작성일 | 2026-06-02 |
| 작성자 | mansik87@gmail.com |
| 관련 문서 | `docs/1-domain-definition.md` (도메인 정의서 v0.2), `docs/2-PRD.md` (PRD v0.1), `docs/3-user-scenarios.md` (사용자 시나리오 v0.1) |
| 문서 목적 | 도메인 정의서·PRD·사용자 시나리오를 기반으로, **5일 1인 개발 MVP** 제약 하에서 일관되고 추적 가능하며 확장 여지를 남기는 코드/디렉토리/품질/보안 설계 원칙을 단일 기준으로 정의한다. |

> 본 문서는 "어떤 코드를 작성하는가"가 아니라 "어떤 원칙·구조·컨벤션으로 작성하는가"를 규정한다. 도메인 정의서의 권한 매트릭스(5장)와 비즈니스 규칙(BR)을 **SSOT(Single Source of Truth)**로 전제하며, 본 문서의 모든 구조 결정은 그 SSOT를 코드에 충실히 반영하기 위한 수단이다.

---

## 1. 최상위 원칙 (모든 스택 공통)

다음 8개 원칙은 프론트엔드·백엔드·DB·운영 전반에 공통 적용되는 설계 헌법이다. 충돌 시 상위 번호 원칙이 우선한다.

| # | 원칙 | 정의 | 이 프로젝트에 필요한 이유(근거) |
|---|---|---|---|
| **P1** | **도메인 중심 (Domain-Centric)** | 코드 구조·명칭·경계를 도메인 정의서의 엔티티(User/Team/Membership/Schedule/ChatMessage/ScheduleChangeRequest/Notification)와 유비쿼터스 언어에 정렬한다. | 일정·채팅·변경요청의 맥락 통합이 핵심 가치이므로, 도메인 개념이 코드 구조의 1차 축이어야 추적성과 정합성이 유지된다. |
| **P2** | **단순성 우선 (Simplicity First)** | 5일/1인/MVP 제약 하에서 가장 단순하게 동작하는 방안을 택한다. 미래를 위한 추측성 추상화(speculative abstraction)를 금지한다. | 5일 1인 개발에서 오버엔지니어링은 Must 기능 미완성(PRD 리스크) 직결이다. 검증된 라이브러리 활용으로 자체 구현을 최소화한다. |
| **P3** | **명시적 경계 (Explicit Boundaries)** | Team이 일관성 경계이며, 레이어(Routes/Service/Repository) 간 책임을 명시적으로 분리한다. 한 모듈이 여러 책임을 겸하지 않는다. | 일관성 경계(Team)와 권한 판정(Membership)이 도메인에 명시되어 있어, 경계를 코드에서 흐리면 권한 우회·정합성 깨짐이 발생한다. |
| **P4** | **일관성 (Consistency)** | 네이밍·폴더 구성·에러 형식·응답 포맷을 전 코드베이스에서 통일한다. 컨벤션은 본 문서가 정본이다. | 1인 개발이라도 일관성이 무너지면 후속 유지보수·확장(3,000팀 목표) 시 비용이 폭증한다. |
| **P5** | **추적성 (Traceability)** | FR/BR/UC/AC ID를 코드(주석·테스트명·커밋)와 연결한다. 핵심 규칙 구현부는 해당 BR/AC ID를 명시한다. | 도메인 정의서 12장 추적성 매트릭스가 SSOT이므로, 코드도 그 ID 체계와 연결되어야 검증·QA가 가능하다(예: 충돌 테스트명에 `BR-07/AC-01`). |
| **P6** | **보안 기본값 (Secure by Default)** | 인증·권한은 항상 서버측에서 강제하며, 안전한 기본값(거부 우선, 해시 저장, 파라미터라이즈드 쿼리)을 적용한다. | BR-01/BR-02/BR-03가 모든 기능의 전제이고, EX-01(권한 우회)·EX-02(비멤버)가 명시된 위협이므로 클라이언트 검증에 의존할 수 없다. |
| **P7** | **테스트 가능 설계 (Testable Design)** | 도메인 규칙(BR-07 충돌, BR-06 유효성, BR-09 상태전이)을 부수효과 없는 순수 함수로 분리해 단위 테스트를 쉽게 만든다. | AC-01~AC-08이 Given-When-Then으로 정의되어 있어, 규칙을 순수 함수로 떼어내면 경계값 버그(PRD 리스크)를 저비용으로 막을 수 있다. |
| **P8** | **확장 여지 (Room to Scale, 구조만)** | 무상태 인증·인덱싱·레이어 분리로 3,000팀 확장의 **구조만 선반영**하되, 실제 분산화(Redis pub/sub 등)는 MVP에서 구현하지 않는다. | PRD가 확장은 "구조만 확보, 실부하 검증은 향후"로 명시한다. 지금 분산 인프라를 구현하면 P2와 충돌한다. |

---

## 2. 의존성 / 레이어 원칙

### 2.1 백엔드 레이어 (Node.js + Express)

의존성은 **항상 안쪽(도메인)을 향하는 단방향**이다. 바깥 레이어는 안쪽을 알지만, 안쪽 레이어(Domain/Service)는 Express나 DB 드라이버 같은 바깥 세부를 직접 알지 않는다.

```
[HTTP/WS 요청]
    │
    ▼
┌─────────────────────────────────────────────┐
│ Routes / Sockets        (입출력 경계)         │  ← Express 라우팅, WS 이벤트 바인딩
├─────────────────────────────────────────────┤
│ Controllers             (요청 해석/응답 직렬화) │  ← req/res 파싱, DTO 변환, 상태코드
├─────────────────────────────────────────────┤
│ Services (도메인 로직)   ★ BR이 사는 곳          │  ← 권한 검사, 충돌 판정, 상태 전이, 이벤트 발행
│   └ Domain (순수 규칙)   BR-06/07/09 순수 함수   │
├─────────────────────────────────────────────┤
│ Repositories            (데이터 접근 추상화)     │  ← SQL/쿼리, 파라미터라이즈드, 매핑
├─────────────────────────────────────────────┤
│ DB (PostgreSQL)                               │
└─────────────────────────────────────────────┘
   ▲ 의존성 방향: 위 → 아래 (단방향, 안쪽으로)
```

| 레이어 | 책임 | 두지 말아야 할 것 |
|---|---|---|
| Routes / Sockets | URL·WS 이벤트와 핸들러 바인딩, 미들웨어 체인 구성 | 비즈니스 로직, SQL |
| Controllers | 요청 검증 위임, DTO 변환, 응답/에러 직렬화 | 도메인 규칙 판정, DB 접근 |
| **Services** | **권한 강제(BR-01~03), 트랜잭션 조율, 도메인 이벤트 발행, 유스케이스 흐름** | HTTP 객체(req/res) 직접 의존 |
| **Domain** | **순수 규칙: 충돌 판정(BR-07), 유효성(BR-06), 상태 전이(BR-09)** | I/O, DB, 시간(현재시각 주입받기) |
| Repositories | 파라미터라이즈드 쿼리, 행↔도메인 매핑, 인덱스 활용 | 권한 판정, 비즈니스 분기 |

> **BR이 사는 곳**: 모든 비즈니스 규칙(BR-01~BR-10)은 Service/Domain 계층에 존재한다. 특히 BR-06/BR-07/BR-09는 부수효과 없는 순수 함수(`domain/`)로 분리해 Controller·Repository에서 재구현하지 않는다(중복 금지).

### 2.2 프론트엔드 레이어 (React)

```
[브라우저 라우팅]
    │
    ▼
Pages / Routes        화면 단위 진입점, 라우팅, 레이아웃 조립
    │
    ▼
Features              도메인 기능 단위 (calendar, chat, schedule-request, team, auth)
    │
    ▼
Components            재사용 UI (presentational), 도메인 무관
    │
    ▼
Hooks                 화면 상태·이펙트, 서버 상태 구독(useXxx)
    │
    ▼
API client / Services REST·WS 호출 캡슐화, DTO ↔ 뷰모델 변환
    │
    ▼
Store / 상태          전역/서버 상태 (인증, 선택 날짜, 팀 컨텍스트)
```

### 2.3 공통 의존성 원칙

| 원칙 | 내용 |
|---|---|
| **단방향 의존** | 의존성은 바깥→안쪽으로만 흐른다. 역방향(Domain→Controller) 참조 금지. |
| **의존성 역전(경량)** | Service는 Repository를 **인터페이스/함수 시그니처**로 받아 사용한다. MVP에서는 무거운 DI 컨테이너 대신 단순 모듈 주입(생성자/팩토리 함수 인자)으로 충분하다(P2). |
| **횡단 관심사 분리** | 인증(JWT 검증), 로깅, 에러 핸들링, 입력 검증은 **미들웨어**로 분리해 각 레이어에 흩뿌리지 않는다. |
| **순환 의존 금지** | 모듈 간 순환 import 금지. 공통 타입/상수는 `utils`·`config`·공유 타입 모듈에 둔다. |
| **권한은 한 곳에서** | 권한 판정 로직은 권한 미들웨어 + Service에 집중(SSOT). Controller나 프론트엔드에 권한 분기를 복제하지 않는다(프론트는 UX 편의용 노출 제어만, 강제는 서버). |

---

## 3. 코드 / 네이밍 원칙

### 3.1 네이밍 규칙 표

| 대상 | 규칙 | 예시 |
|---|---|---|
| 폴더명 | kebab-case (복수형 권장) | `schedule-requests/`, `middlewares/` |
| 백엔드 파일(모듈) | kebab-case + 역할 접미사 | `schedule.service.js`, `chat.controller.js`, `conflict.domain.js` |
| React 컴포넌트 파일/이름 | PascalCase | `CalendarView.tsx`, `ChatPanel.tsx` |
| React 훅 | camelCase + `use` 접두 | `useSchedules`, `useDailyChatLog`, `useAuth` |
| 변수/함수 | camelCase | `detectConflict`, `targetDate`, `applyChangeRequest` |
| 클래스/타입/인터페이스 | PascalCase | `ScheduleChangeRequest`, `ConflictResult` |
| 상수/환경키 | UPPER_SNAKE_CASE | `JWT_ACCESS_TTL`, `MAX_TEAM_MEMBERS` |
| 도메인 이벤트명 | PascalCase (도메인 정의서 7장 그대로) | `ScheduleCreated`, `ScheduleConflictDetected`, `ScheduleChangeApplied` |
| DB 테이블 | snake_case 복수형 | `users`, `teams`, `memberships`, `schedules`, `chat_messages`, `schedule_change_requests`, `notifications` |
| DB 컬럼 | snake_case | `team_id`, `start_at`, `end_at`, `is_all_day`, `target_date`, `origin_message_id`, `created_at` |
| REST 경로 | kebab-case 복수 리소스, 동사 미사용 | `GET /api/teams/:teamId/schedules`, `POST /api/teams/:teamId/schedule-change-requests` |
| WS 이벤트 채널 | 도메인:행위 형태 | `chat:message`, `schedule:updated`, `request:applied` |

### 3.2 유비쿼터스 언어의 코드 반영

- 도메인 정의서 3장의 **정규 명칭**을 코드 식별자에 그대로 사용한다: `Schedule`, `ScheduleChangeRequest`, `ChatMessage`, `DailyChatLog`(조회 뷰), `Membership`, `Notification`.
- 변형 표현 금지: "팀 일정 항목", "변경 요청 건", "event"(Schedule을 가리키며), "request"(단독으로 모호) 등을 코드에 쓰지 않는다.
- **상태값**은 도메인 정의서 6.2를 따른다: `Requested` / `Applied` / `Rejected` (DB 저장 시 `requested`/`applied`/`rejected` snake/lower로 정규화하되 의미는 동일하게).
- **역할**은 `team_leader` / `team_member` (도메인 5장). 권한 판정은 항상 이 역할값을 통해 수행(BR-10 단일 역할 전제).
- 시간 필드는 `startAt`/`endAt`(UTC), `targetDate`(달력 날짜), `createdAt`(작성 시각, UTC)을 도메인 4.1 정의대로 구분해 명명한다.

### 3.3 폴더 구성 방식: Feature-First 권장

MVP 규모에서는 **기능별(feature-first)**을 1차 축으로, 그 안에서 레이어를 두는 방식을 권장한다.

| 비교 | 레이어별(layer-first) | **기능별(feature-first, 권장)** |
|---|---|---|
| 응집도 | 같은 기능 코드가 여러 폴더에 분산 | 한 기능(예: schedule-request)의 코드가 한곳에 모임 |
| 1인 개발 적합성 | 파일 점프 잦음 | 컨텍스트 전환 적어 5일 개발에 유리 |
| 도메인 정렬(P1) | 약함 | 강함(엔티티=폴더) |

- **근거**: 도메인 엔티티가 명확히 7개로 정의(P1)되어 있고, 1인 개발에서 기능 단위로 작업·완결하는 PRD 일정(Day별 산출물)과도 맞는다. 단, 백엔드는 레이어 명확성이 중요하므로 **기능 폴더 내부에서 레이어 접미사(`.controller`/`.service`/`.repository`)로 구분**하는 하이브리드를 채택한다(6장 트리 참조).

---

## 4. 테스트 / 품질 원칙

### 4.1 테스트 피라미드와 MVP 우선순위

5일 1인 제약상 **광범위 커버리지보다 고위험 규칙 집중**이 원칙이다.

| 계층 | 비중(MVP) | 대상 | 우선순위 근거 |
|---|---|---|---|
| **단위(Unit)** | **높음 (핵심)** | 충돌 판정(BR-07), 일정 유효성(BR-06), 상태 전이(BR-09), 권한 판정(BR-03) | 순수 함수라 저비용·고가치. 경계값 버그가 PRD 명시 리스크. |
| 통합(Integration) | 중간 | 권한 미들웨어 + API(BR-01/02/03), Repository↔DB(인덱스/UTC) | 인증·권한 우회(EX-01/02)는 통합 수준에서 검증 필요. |
| E2E | 낮음(선택) | 핵심 해피패스 1~2개(SC-05 변경요청→Applied) | 비용이 커 MVP에선 수동 검증으로 대체 가능. |

**단위 테스트 필수 항목(AC 연결)** — 다음은 반드시 자동화한다:

| 테스트 | 검증 AC | 핵심 케이스 |
|---|---|---|
| 충돌 판정 — 겹침 | AC-01 | `10:00~11:00` vs `10:30~11:30` → 충돌 |
| 충돌 판정 — 경계 접촉 | AC-02 | `A.endAt == B.startAt` → 충돌 아님(`<`, not `≤`) |
| 충돌 판정 — 자기 제외 | AC-03 | 동일 `scheduleId` 비교 제외 |
| 충돌 판정 — 종일 정규화 | BR-07 | `isAllDay` → `[00:00, 익일 00:00)` 반열린 구간 |
| 일정 유효성 — 경계값 | AC-04 | `start==end`, `end<start` → 거부 |
| 권한 거부 — 팀원 수정 | AC-05 | 팀원의 Schedule CUD → 거부 |
| 인증/비멤버 차단 | AC-06 | 무토큰·비멤버 접근 → 거부 |
| 상태 전이 — 반영/종결 | AC-07, AC-08 | `Requested→Applied`, 종결 상태 재전이 거부 |

> 테스트명에 **BR/AC ID를 포함**한다(P5). 예: `detectConflict: returns false on boundary touch (BR-07/AC-02)`. 충돌 비교는 **분 단위 정규화**(BR-07)·UTC 기준임을 테스트가 고정한다.

### 4.2 정적 품질 / 타입

| 항목 | 원칙 |
|---|---|
| 린트 | **ESLint** 적용, 경고 누적 금지(에러로 승격할 핵심 규칙만 최소 선별). |
| 포매터 | **Prettier** 적용, 포맷 논쟁 제거. 저장 시 자동 포맷 권장. |
| 타입 | **TypeScript 권장(특히 프론트엔드 및 도메인 규칙 모듈).** 근거: 도메인이 상태값·역할·시간 필드 등 오타·혼동 위험이 큰 식별자를 다수 가지며, 상태 전이(BR-09)와 충돌(BR-07)을 타입으로 좁히면 버그를 컴파일 타임에 잡는다. 단, 5일 제약상 **전면 도입이 부담이면 도메인 핵심 모듈부터 점진 적용**하고 나머지는 JSDoc 타입으로 보완한다(P2). |
| 커밋 | 작고 의미 단위로. 메시지에 관련 FR/BR/UC ID 참조 권장(예: `feat(schedule): conflict detection BR-07`). |
| CI 최소 기준 | push 시 **lint + 단위 테스트** 통과를 최소 게이트로 한다. MVP에선 이 둘만으로 충분(P2). |

---

## 5. 설정 / 보안 / 운영 원칙

### 5.1 환경설정 (12-Factor 일부 적용)

| 원칙 | 내용 |
|---|---|
| 설정의 환경 분리 | 모든 환경 의존 값은 `.env`로 분리(코드에 하드코딩 금지). `development`/`production` 최소 분리. |
| 비밀 관리 | `.env`는 `.gitignore`로 커밋 금지. `.env.example`에 키 목록만(값 제외) 공유. JWT 시크릿·DB 비밀번호는 환경변수로만 주입. |
| 설정 단일 로딩 | `config/` 한 곳에서 env를 읽어 검증된 설정 객체로 노출. 각 모듈이 `process.env`를 직접 읽지 않는다. |
| 포트/DB URL/토큰 TTL | 환경변수화: `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `CORS_ORIGIN` 등. |

### 5.2 보안 (P6 구체화)

| 항목 | 원칙 | 근거 |
|---|---|---|
| 비밀번호 | **bcrypt(또는 argon2) 해시 저장, 평문 절대 미저장.** | NFR-04, SC-01 |
| JWT | 무상태 액세스 토큰. 모든 **REST 요청 + WS 핸드셰이크**에서 검증. 시크릿은 환경변수. 리프레시 토큰 도입은 오픈이슈(OI-4) — MVP는 액세스 토큰만으로 시작 가능. | PRD 9장, OI-4 |
| 권한 서버측 강제 | 권한 매트릭스(도메인 5장)를 **서버 미들웨어/Service에서 강제(SSOT)**. 프론트의 버튼 숨김은 UX 편의일 뿐 강제 아님. 비멤버·팀원의 직접 API 호출(EX-01/02)도 차단. | BR-01/02/03, AC-05/06, EX-01/02 |
| 입력 검증 | 모든 외부 입력을 경계(Controller/미들웨어)에서 스키마 검증. 일정 시간(BR-06), targetDate, 역할값 등 검증 후 Service 진입. | BR-06, EX-03 |
| SQL 인젝션 방지 | **파라미터라이즈드 쿼리 또는 ORM/쿼리빌더**만 사용. 문자열 연결로 SQL 구성 금지. | P6 |
| CORS | 허용 오리진을 환경변수로 화이트리스트. 와일드카드 전체 허용 금지(프로덕션). | P6 |
| 일관성 경계 강제 | 모든 팀 리소스 접근 시 `teamId` + 요청자 Membership 확인을 강제(타 팀 데이터 격리). | BR-02 |

### 5.3 운영

| 항목 | 원칙 |
|---|---|
| 로깅 | 구조화 로깅(요청 ID, teamId, userId, 이벤트명). 비밀번호·토큰 등 민감정보 로깅 금지. |
| 에러 핸들링 표준 | 중앙 에러 미들웨어로 일원화. **표준 에러 응답 포맷**(`{ error: { code, message } }`)과 HTTP 상태코드 매핑(401 인증, 403 권한, 400 검증, 404, 409 충돌/상태전이 위반)을 통일. |
| 헬스체크 | `GET /health` 엔드포인트(DB 연결 상태 포함) 제공. |
| DB 마이그레이션 | **마이그레이션 파일로 스키마 버전 관리**(`db/migrations/`). 수동 DDL 금지. 인덱스(`team_id`, `target_date`, `start_at`/`end_at`)를 마이그레이션에 포함(NFR-02). |
| UTC 저장 원칙 | **모든 일시는 UTC로 저장**(`start_at`/`end_at`/`created_at`). 사용자 시간대 변환은 **표시 계층(프론트)에서만** 수행. 충돌 비교는 UTC·분 단위(BR-07, NFR-05). |
| 실시간 | WebSocket은 **팀 단위 룸(room)** 으로 브로드캐스트. MVP는 단일 인스턴스 룸, 다중 인스턴스(Redis pub/sub)는 향후(P8). |

---

## 6. 디렉토리 구조

### 6.1 모노레포 방침

단일 Git 레포 내에서 **`client/`(React)와 `server/`(Express)를 분리**한다. 무거운 모노레포 툴링(Nx/Turborepo 등)은 도입하지 않는다 — 1인 5일 MVP에서는 단순 디렉토리 분리로 충분하다(P2). 공유가 필요한 타입(예: 도메인 상태값)은 초기엔 각 측에 복제하거나 경량 공유 폴더로 두고, 과도한 추상화는 피한다.

### 6.2 루트 구조

```
team-caltalk/
├─ client/            # React SPA (프론트엔드)
├─ server/            # Node.js + Express API + WebSocket
├─ docs/              # 도메인 정의서·PRD·시나리오·본 설계 원칙
├─ .env.example       # 환경변수 키 목록(값 제외)
├─ .gitignore
└─ README.md          # 셋업·실행·아키텍처 개요
```

### 6.3 백엔드 (`server/`)

기능 폴더(`modules/`) 내부를 레이어 접미사로 구분하는 하이브리드 구조. 도메인 엔티티가 폴더로 직접 드러난다(P1).

```
server/
├─ src/
│  ├─ app.js                     # Express 앱 조립, 미들웨어 체인
│  ├─ server.js                  # HTTP+WS 서버 부트스트랩, 포트 바인딩
│  │
│  ├─ config/                    # env 로딩·검증, 설정 객체 단일 노출
│  │  └─ index.js
│  │
│  ├─ routes/                    # 라우터 집약(모듈 라우터 마운트)
│  │  └─ index.js
│  │
│  ├─ modules/                   # ★ 기능(도메인)별 묶음
│  │  ├─ auth/                   # 인증 (FR-01, BR-01)
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.service.js      # JWT 발급/검증, bcrypt 해시
│  │  │  └─ auth.repository.js
│  │  ├─ team/                   # 팀·멤버십 (FR-02, BR-02/10)
│  │  │  ├─ team.controller.js
│  │  │  ├─ team.service.js
│  │  │  └─ team.repository.js
│  │  ├─ schedule/               # 일정 (FR-03/04/05/06)
│  │  │  ├─ schedule.controller.js
│  │  │  ├─ schedule.service.js  # 권한·충돌·이벤트 조율(BR-03/07/08)
│  │  │  └─ schedule.repository.js
│  │  ├─ chat/                   # 채팅·Daily Chat Log (FR-07, BR-05)
│  │  │  ├─ chat.controller.js
│  │  │  ├─ chat.service.js
│  │  │  └─ chat.repository.js
│  │  ├─ schedule-request/       # 변경 요청 (FR-08/09, BR-04/09)
│  │  │  ├─ schedule-request.controller.js
│  │  │  ├─ schedule-request.service.js  # 상태 전이 조율
│  │  │  └─ schedule-request.repository.js
│  │  └─ notification/           # 화면 내 알림 (도메인 7장)
│  │     └─ notification.service.js
│  │
│  ├─ domain/                    # ★ 순수 도메인 규칙(부수효과 없음)
│  │  ├─ conflict.js             # BR-07 충돌 판정(분 단위, 종일 정규화)
│  │  ├─ schedule-validation.js  # BR-06 유효성
│  │  ├─ change-request-state.js # BR-09 상태 전이표
│  │  └─ permissions.js          # 권한 매트릭스(도메인 5장) 표현
│  │
│  ├─ events/                    # 도메인 이벤트 정의·디스패치
│  │  └─ domain-events.js        # ScheduleCreated 등(도메인 7장)
│  │
│  ├─ middlewares/               # 횡단 관심사
│  │  ├─ authenticate.js         # JWT 검증(BR-01)
│  │  ├─ authorize.js            # 팀 소속·역할 강제(BR-02/03)
│  │  ├─ validate.js             # 입력 스키마 검증
│  │  └─ error-handler.js        # 표준 에러 응답
│  │
│  ├─ sockets/                   # WebSocket(socket.io) 게이트웨이
│  │  ├─ index.js                # 핸드셰이크 인증, 팀 룸 관리
│  │  └─ handlers.js             # chat:message, schedule:updated 등
│  │
│  ├─ db/
│  │  ├─ pool.js                 # PostgreSQL 커넥션 풀(NFR-02)
│  │  └─ migrations/             # 스키마 버전 관리(인덱스 포함)
│  │
│  └─ utils/                     # 시간(UTC)·로거 등 공용 유틸
│     ├─ time.js                 # UTC 정규화, 분 단위 절삭
│     └─ logger.js
│
├─ tests/                        # 단위/통합 테스트(BR/AC ID 명명)
│  ├─ unit/conflict.test.js      # AC-01/02/03, 종일 정규화
│  └─ integration/auth.test.js   # AC-06 등
├─ package.json
└─ .env.example
```

| 디렉토리 | 한 줄 설명 |
|---|---|
| `modules/` | 도메인 기능 단위 묶음. 각 모듈은 controller/service/repository 3계층. |
| `domain/` | I/O 없는 순수 규칙(BR-06/07/09, 권한 매트릭스). 단위 테스트의 1차 대상. |
| `events/` | 도메인 정의서 7장 이벤트 정의 및 Notification 트리거 디스패치. |
| `middlewares/` | 인증·권한·검증·에러 등 횡단 관심사 분리(레이어 오염 방지). |
| `sockets/` | 팀 룸 기반 실시간 채널, 핸드셰이크 JWT 인증. |
| `db/migrations/` | 스키마·인덱스의 버전 관리(수동 DDL 금지). |

### 6.4 프론트엔드 (`client/`)

캘린더+채팅 **통합 화면**(PRD 10장)을 1급 화면으로 두고, 기능별 폴더로 구성한다.

```
client/
├─ src/
│  ├─ main.tsx                   # 엔트리, 라우터·전역 프로바이더 마운트
│  ├─ App.tsx                    # 라우트 정의, 레이아웃 셸
│  │
│  ├─ pages/                     # 화면 단위 진입점
│  │  ├─ LoginPage.tsx           # 로그인/회원가입 (UC-01)
│  │  └─ TeamWorkspacePage.tsx   # ★ 캘린더+채팅 통합 화면 (핵심)
│  │
│  ├─ features/                  # ★ 도메인 기능 단위
│  │  ├─ auth/                   # 로그인·가입·토큰 (FR-01)
│  │  ├─ team/                   # 팀 전환·멤버십 (FR-02)
│  │  ├─ calendar/               # 월/주/일 뷰, 날짜 선택 (FR-03)
│  │  ├─ schedule/               # 일정 등록/수정 모달, 충돌 경고 (FR-04/05/06)
│  │  ├─ chat/                   # 채팅 패널, Daily Chat Log (FR-07)
│  │  ├─ schedule-request/       # 변경 요청 생성·처리 UI (FR-08/09)
│  │  └─ notification/           # 화면 내 알림 표시
│  │
│  ├─ components/                # 도메인 무관 재사용 UI(Button, Modal 등)
│  ├─ hooks/                     # 공용 훅(useAuth, useSocket 등)
│  ├─ api/                       # REST/WS 클라이언트, 엔드포인트 래퍼
│  │  ├─ client.ts               # axios/fetch 인스턴스, JWT 주입
│  │  └─ socket.ts               # WebSocket 연결·팀 룸 구독
│  ├─ store/                     # 전역/서버 상태(인증, 선택 날짜, 팀 컨텍스트)
│  ├─ lib/                       # 시간대 변환(UTC↔KST) 등 순수 유틸
│  │  └─ datetime.ts             # 표시 변환은 여기서만(NFR-05)
│  └─ styles/                    # 전역 스타일·테마, 반응형 토큰
│
├─ package.json
└─ index.html
```

| 디렉토리 | 한 줄 설명 |
|---|---|
| `pages/` | 라우트 진입 화면. `TeamWorkspacePage`가 캘린더+채팅을 한 화면에 조립(핵심 레이아웃). |
| `features/` | 도메인 기능별 컴포넌트·훅·로컬 상태 묶음(백엔드 modules와 대칭). |
| `api/` | 서버 통신 캡슐화. JWT 헤더 주입과 WS 팀 룸 구독을 한 곳에서 관리. |
| `store/` | 인증 상태·선택 날짜(targetDate 동기화)·현재 팀 등 전역 상태. |
| `lib/datetime.ts` | UTC↔사용자 시간대 변환을 단일 모듈로 격리(표시 계층 전용, NFR-05). |

### 6.5 확정 보조 도구 (PRD 9장 기술 스택과 정합)

아래는 PRD 분석을 거쳐 확정된 라이브러리다(선정 근거·대안 비교는 PRD 9장 및 기술 스택 선정 분석 참조). 동일 설계 원칙을 지키는 한 합리적 대안 채택은 가능하다.

| 용도 | 확정 | 근거 요약 |
|---|---|---|
| 빌드 도구 | **Vite 5** | 빠른 HMR·zero-config TS, 5일 개발 생산성(P2) |
| 서버 상태/데이터 패칭 | **TanStack Query v5** | 캐싱·실시간 무효화가 일정/채팅 다중 갱신과 정합(NFR-03) |
| 전역 클라이언트 상태 | **Zustand** | 소수 상태에 경량 최적, Redux는 과함(P2) |
| HTTP 클라이언트 | **axios** | 인터셉터로 JWT 주입·에러 표준화 일원화 |
| 폼/검증 | **react-hook-form + zod** | 일정 모달 검증(BR-06), zod 스키마 BE 공유 |
| 스타일 | **Tailwind CSS** | 유틸리티 우선 반응형(NFR-08) 빠른 구현 |
| 캘린더 UI | **FullCalendar (@fullcalendar/react)** | 월/주/일 뷰 즉시 제공(FR-03), 자체 구현 금지(PRD 리스크 완화) |
| 날짜/시간 | **date-fns + date-fns-tz** | UTC↔로컬 변환 단일화(NFR-05, `lib/datetime.ts`) |
| 실시간 클라이언트 | **socket.io-client v4** | 서버 socket.io와 짝, 재연결·룸 위임 |

> 백엔드 측 확정(Express 4 / socket.io v4 / jsonwebtoken+bcrypt / zod / **node-postgres(pg) raw + node-pg-migrate** / pino / Vitest+supertest)은 PRD 9장 표를 따른다. 데이터 접근은 ORM 미채택(OI-8 결정)으로, 파라미터라이즈드 쿼리를 직접 작성하되 Repository 레이어(6.3)가 SQL을 캡슐화한다.

---

## 7. 적용 및 예외

### 7.1 적용 범위

- 본 원칙은 **5일 1인 MVP** 기준이다. 모든 신규 코드는 본 문서의 네이밍·레이어·보안 원칙을 따른다.
- 원칙 간 충돌 시 **1장의 상위 번호 원칙(특히 P2 단순성, P6 보안)**을 우선한다. 단, **P6(보안)은 P2(단순성)보다 우선**한다 — 보안·권한은 단순성을 이유로 약화할 수 없다.

### 7.2 예외 처리

- 원칙 위반이 불가피할 때(시간 제약·라이브러리 한계 등)는 **금지가 아니라 명시적 문서화 후 인정**한다.
- 예외는 코드 주석에 `// EXCEPTION(P#): 사유 / 향후 정리 계획`을 남기고, 가능하면 README나 이슈에 기록한다.
- 단, **다음은 예외를 허용하지 않는다(Hard Rule)**: 권한 서버측 강제(BR-01/02/03), 비밀번호 해시 저장, 파라미터라이즈드 쿼리, UTC 저장. 이들은 데이터 무결성·보안 직결이라 단축할 수 없다.

### 7.3 향후 강화 항목 (MVP 이후)

| 항목 | 강화 방향 |
|---|---|
| 타입 안정성 | TypeScript 전면 적용, 공유 도메인 타입 패키지화 |
| 테스트 | E2E 자동화(SC-05 핵심 플로우), 통합 테스트 커버리지 확대 |
| 실시간 확장 | Redis pub/sub 기반 다중 인스턴스 브로드캐스트(NFR-02, P8) |
| 의존성 관리 | 경량 주입 → 명시적 DI 경계 정리, 도메인 이벤트 버스 정식화 |
| 관측성 | 구조화 로깅 → 메트릭·트레이싱(3,000팀 실부하 대비) |
| CI/CD | lint+test 게이트 → 빌드·배포 파이프라인, 마이그레이션 자동 적용 |

> 향후 강화는 **실제 필요가 검증된 시점에** 도입한다. MVP 단계에서 위 항목을 선제 구현하는 것은 P2(단순성) 위반이다.

---

이 문서는 도메인 정의서 v0.2의 SSOT(권한 매트릭스·BR·도메인 이벤트)와 PRD v0.1의 기술 스택·제약·일정, 사용자 시나리오 v0.1의 행동 맥락에 정합하도록 작성되었다. 모든 구조 결정의 1차 기준은 **도메인 정합성**, 2차 기준은 **5일 1인 MVP의 실현 가능성**이다.

# Team CalTalk 도메인 정의서 (v0.2)

## 0. 문서 메타데이터

| 항목 | 내용 |
|---|---|
| 문서명 | Team CalTalk 도메인 정의서 |
| 버전 | v0.2 |
| 상태 | Draft |
| 작성자 | Team CalTalk 도메인 설계팀 |
| 최종수정일 | 2026-06-02 |
| 문서 목적 | Team CalTalk 서비스의 도메인 개념, 권한 정책, 비즈니스 규칙, 유스케이스, 도메인 이벤트, 수용 기준을 단일 출처로 정의하여 후속 설계(ERD·API 명세)와 구현의 기준을 제공한다. |

### 변경 이력

| 버전 | 일자 | 변경 내용 |
|---|---|---|
| v0.1 | 2026-05-26 | 최초 작성 (개요·문제정의·유비쿼터스 언어·도메인 개념·권한·규칙·유스케이스·범위·가정) |
| v0.2 | 2026-06-02 | 평가 결과 반영 개정. 충돌 판정 규칙 정밀 명세, ScheduleChangeRequest 상태 전이 정리, ID 체계 및 추적성 매트릭스 신설, 수용 기준(Given-When-Then) 추가, 도메인 이벤트·알림(Notification) 개념 도입, 용어 표기 단일화, Daily Chat Log·ChatMessage 대상 날짜 정의 명확화, 문서 메타데이터·변경이력·관련 문서 섹션 추가, 권한 매트릭스를 SSOT로 지정 |

### 관련 문서

| 문서 | 경로 | 상태 |
|---|---|---|
| 제품 요구사항 정의서(PRD) | `docs/2-PRD.md` | 작성됨 (v0.1) |
| 사용자 시나리오 | `docs/3-user-scenarios.md` | 작성됨 (v0.1) |
| 프로젝트 구조 설계 원칙 | `docs/4-project-structure-principles.md` | 작성됨 (v0.1) |
| 기술 아키텍처 다이어그램 | `docs/5-arch-diagram.md` | 작성됨 (v0.1) |
| 데이터 모델(ERD) | `docs/6-erd.md` | 예정(placeholder) |
| API 명세 | `docs/7-api-spec.md` | 예정(placeholder) |

---

## 1. 개요

**Team CalTalk**은 팀 단위의 일정 관리와 실시간 채팅을 하나의 화면에서 통합 제공하는 협업 애플리케이션이다. 흩어진 개인 캘린더·메신저·엑셀로 인해 발생하는 일정 충돌과 누락을 줄이고, 일정과 대화의 맥락을 한 곳에 묶어 추적 가능하게 한다. 팀장이 팀 일정의 단일 권한자(single source of truth)로서 일정을 통제하고, 팀원은 일정을 열람하며 변경이 필요할 때 채팅으로 요청함으로써, 명확한 책임 체계 위에서 일정과 소통을 일원화하는 것이 핵심 가치다.

---

## 2. 문제 정의 & 해결 방향

| 문제 | 영향 | 해결 방향 (솔루션) |
|---|---|---|
| 일정이 개인 캘린더·메신저·엑셀로 흩어져 있음 | 충돌·중복·누락 발생 | 팀 단위 통합 캘린더(월/주/일 뷰)로 일정을 단일화 |
| 일정과 대화가 분리되어 맥락 회수가 어려움 | 변경 사유·이력 추적 곤란 | 캘린더와 채팅을 한 화면에서 함께 보며 일자별 채팅 이력 보존 |
| 팀장이 개인 일정을 직접 제어하기 어려움 | 일정 책임 소재 불명확 | 팀장에게 팀 일정 수정 권한 집중, 팀원은 채팅 기반 변경 요청 |

---

## 3. 핵심 용어 (유비쿼터스 언어)

> **표기 단일화 규칙**: 팀 일정은 **Schedule**, 일정 변경 요청은 **ScheduleChangeRequest**, 채팅 메시지는 **ChatMessage** 를 정규 명칭으로 고정한다. 본 문서 및 후속 산출물에서는 변형 표현("팀 일정 항목", "변경 요청 건" 등)을 사용하지 않고 정규 명칭으로 통일한다.

| 용어 | 정의 |
|---|---|
| 사용자(User) | 인증을 거쳐 애플리케이션을 이용하는 개인 계정 |
| 팀(Team) | 일정과 채팅을 공유하는 협업 단위 |
| 멤버십(Membership) | 사용자가 특정 팀에 속한 관계와 그 역할 |
| 팀장(Team Leader) | 팀 일정을 추가·수정·삭제할 수 있는 역할 |
| 팀원(Team Member) | 팀 일정을 열람만 할 수 있는 역할 |
| 팀 일정(Schedule) | 팀에 소속된, 날짜·시간 정보를 가진 일정 항목 (정규 명칭: **Schedule**) |
| 채팅 메시지(ChatMessage) | 팀 채팅 채널에 작성되는 메시지로, **대상 날짜(targetDate)** 기준으로 일자별 이력에 귀속됨 |
| 일정 변경 요청(ScheduleChangeRequest) | 팀원이 채팅을 통해 특정 Schedule의 변경을 요청하는 행위이자 그 상태를 가진 객체 (정규 명칭: **ScheduleChangeRequest**) |
| 일정 충돌(Schedule Conflict) | 동일 팀 내에서 시간대가 겹치는 Schedule이 존재하는 상태 (판정 규칙은 BR-07 참조) |
| 일자별 채팅 이력(Daily Chat Log) | 특정 **대상 날짜(targetDate)**를 기준으로 묶여 보존되는 ChatMessage 집합. 별도 엔티티가 아니라 ChatMessage들을 targetDate로 그룹핑한 조회 관점(View)이다. |
| 알림(Notification) | 충돌 경고, 일정 변경 공유 등 도메인 이벤트의 결과를 관련 사용자에게 전달하는 수단. 화면 내 통지를 1차 형태로 하며, 푸시 고도화는 Out-of-Scope다. |

---

## 4. 핵심 도메인 개념 (엔티티 / 애그리거트)

| ID | 도메인 객체 | 유형 | 주요 속성 | 관계 |
|---|---|---|---|---|
| DM-User | **User** | 애그리거트 루트 | userId, 이메일, 표시이름, 인증정보 | 여러 Membership을 가짐 |
| DM-Team | **Team** | 애그리거트 루트 | teamId, 팀명, 생성일 | Membership·Schedule·ChatMessage를 포함 |
| DM-Membership | **Membership** | 엔티티 | membershipId, userId, teamId, **역할(팀장/팀원)**, 가입일 | User ↔ Team을 연결 |
| DM-Schedule | **Schedule** | 애그리거트 루트 | scheduleId, teamId, 제목, startAt(UTC), endAt(UTC), isAllDay(종일 여부), 작성자(팀장) | Team에 속함, ScheduleChangeRequest의 대상 |
| DM-ChatMessage | **ChatMessage** | 엔티티 | messageId, teamId, 작성자, 본문, **targetDate(대상 날짜)**, createdAt(생성시각, UTC) | Team의 Daily Chat Log에 귀속, ScheduleChangeRequest를 담을 수 있음 |
| DM-ScheduleChangeRequest | **ScheduleChangeRequest** | 엔티티 | requestId, 요청자(팀원), 대상 scheduleId, 요청 내용, **상태(Requested/Applied/Rejected)**, originMessageId, 처리자(팀장), 처리시각 | ChatMessage를 매개로 발생, Schedule을 참조 |
| DM-Notification | **Notification** | 값/메시지 | notificationId, 대상 사용자, 유형(충돌경고/변경공유 등), 발생 이벤트, 발생시각 | 도메인 이벤트로부터 생성, 사용자에게 전달 |

> 참고: **Team**이 일정·채팅·멤버십을 묶는 일관성 경계(Consistency Boundary)의 중심이며, 권한 판정은 항상 Membership의 역할을 통해 이루어진다.

### 4.1 ChatMessage의 대상 날짜(targetDate)와 생성시각(createdAt)

- **createdAt**: 메시지가 실제로 작성된 물리적 시각으로, UTC로 저장된다. 변경되지 않는다.
- **targetDate**: 메시지가 귀속되는 **달력상 날짜**로, Daily Chat Log 그룹핑의 키다.
- **부여 방식**: targetDate는 메시지 작성 시점에 자동 부여된다. 기본값은 작성 시점의 캘린더에서 사용자가 보고 있는(선택한) 날짜이며, 별도 선택이 없으면 createdAt을 사용자 표시 기준일로 환산한 날짜를 사용한다.
- **createdAt과의 차이**: 동일한 createdAt(예: 자정 직후 작성)이라도, 사용자가 전날 일정을 논의 중이었다면 targetDate는 전날로 부여될 수 있다. 즉 targetDate는 "어느 날짜의 맥락에 대한 메시지인가"를, createdAt은 "언제 작성되었는가"를 나타낸다.

### 4.2 Daily Chat Log와 ChatMessage 애그리거트의 관계

- Daily Chat Log는 독립 애그리거트가 아니라, 동일 Team의 ChatMessage들을 동일 targetDate로 묶은 **조회 관점(read view)**이다.
- 일관성 경계는 Team이며, ChatMessage는 Team 내에서 생성·보존된다.
- 특정 날짜의 Daily Chat Log = `{ Team의 ChatMessage | ChatMessage.targetDate == 선택 날짜 }`.

---

## 5. 역할과 권한 (권한 정책 SSOT)

> **단일 출처(SSOT)**: 본 권한 매트릭스를 권한 정책의 **정본**으로 지정한다. 비즈니스 규칙·유스케이스·구현 간 권한 해석이 충돌할 경우 본 표를 기준으로 한다.

| 기능 | 팀장(Team Leader) | 팀원(Team Member) |
|---|:---:|:---:|
| 팀 일정(Schedule) 조회 (월/주/일) | O | O |
| 팀 일정(Schedule) 추가 | O | X |
| 팀 일정(Schedule) 수정 | O | X |
| 팀 일정(Schedule) 삭제 | O | X |
| 채팅 메시지(ChatMessage) 작성/조회 | O | O |
| 일자별 채팅 이력(Daily Chat Log) 조회 | O | O |
| 일정 변경 요청(ScheduleChangeRequest) 생성 | O | O |
| 변경 요청 반영(Applied) / 반려(Rejected) 처리 | O | X |

> 모든 기능은 **인증된 사용자**이면서 **해당 팀의 멤버**일 때만 접근 가능하다. (BR-01, BR-02 적용)

---

## 6. 핵심 도메인 규칙 (비즈니스 규칙)

| ID | 규칙명 | 내용 |
|---|---|---|
| BR-01 | 인증 전제 | 인증되지 않은 사용자는 어떤 기능에도 접근할 수 없다. |
| BR-02 | 팀 소속 전제 | 사용자는 자신이 속한 팀의 일정과 채팅만 조회·이용할 수 있다. 비멤버의 접근은 거부된다. |
| BR-03 | 일정 수정 권한 제한 | Schedule의 추가·수정·삭제는 **팀장만** 수행할 수 있다. 팀원은 어떤 경우에도 Schedule을 직접 변경할 수 없다. |
| BR-04 | 채팅 기반 변경 요청 | 팀원이 일정 변경을 원하면 직접 수정 대신 **채팅으로 ScheduleChangeRequest를 생성**한다. 실제 반영은 팀장의 처리로만 이루어진다. |
| BR-05 | 일자별 채팅 이력 보존 | ChatMessage는 **targetDate** 기준으로 묶여 Daily Chat Log로 보존되며, 사후 조회가 가능하다. |
| BR-06 | 일정 유효성 | Schedule의 endAt은 startAt보다 이후여야 한다(startAt < endAt). 동일하거나 역전된 경우 무효다. |
| BR-07 | 일정 충돌 판정 | 충돌 판정 규칙은 아래 6.1에 따른다. |
| BR-08 | 충돌 시 동작 | 충돌이 감지되어도 Schedule은 **저장하되**, 팀장에게 **경고를 반환**한다(차단하지 않음). |
| BR-09 | 변경 요청 상태 전이 | ScheduleChangeRequest의 상태 전이는 아래 6.2의 상태 전이표를 따른다. |
| BR-10 | 역할 유일성 | 한 사용자는 한 팀 내에서 하나의 역할(팀장 또는 팀원)만 가진다. |

### 6.1 일정 충돌 판정 규칙 (BR-07 상세)

동일 팀 내 두 Schedule **A**, **B**에 대해 다음을 모두 만족할 때 **충돌**로 판정한다.

```
충돌(A, B) ≡ (A.startAt < B.endAt) AND (B.startAt < A.endAt)
```

- **경계 접촉 제외**: 한쪽의 종료가 다른 쪽의 시작과 같은 경우(`A.endAt == B.startAt` 또는 `B.endAt == A.startAt`)는 **충돌이 아니다**. 즉 비교 연산자는 `<`(미만)이며 `≤`가 아니다.
- **자기 자신 제외**: Schedule을 수정할 때 동일 일정(`A.scheduleId == B.scheduleId`)은 비교 대상에서 제외한다.
- **비교 기준**: 모든 일시는 **UTC로 저장**하고, **분(minute) 단위**를 공통 기준으로 비교한다(초 이하는 비교 기준에서 절삭/정규화).
- **종일(전일) 일정 처리**: `isAllDay == true`인 Schedule은 해당 날짜의 `[당일 00:00 UTC, 다음날 00:00 UTC)` 반열린 구간으로 정규화하여 위 수식을 동일하게 적용한다. 따라서 같은 날의 종일 일정과 시간 일정은 겹치며, 인접한 날의 두 종일 일정(`다음날 00:00` 경계 접촉)은 충돌이 아니다.
- **감지 후 동작**: 충돌이 감지되어도 Schedule은 저장하며, 팀장에게 경고를 반환한다(BR-08). 저장은 차단되지 않는다.

> 예시: A=`10:00~11:00`, B=`11:00~12:00` → `A.endAt == B.startAt` 이므로 **충돌 아님**. A=`10:00~11:00`, B=`10:30~11:30` → `10:00<11:30 AND 10:30<11:00` 이므로 **충돌**.

### 6.2 ScheduleChangeRequest 상태 전이 (BR-09 상세)

ScheduleChangeRequest는 다음 세 가지 정식 상태를 가진다: **Requested(요청됨)**, **Applied(반영됨)**, **Rejected(반려됨)**.

| 현재 상태 | 이벤트 | 다음 상태 | 전이 주체 |
|---|---|---|---|
| (없음) | 변경 요청 생성 | Requested | 팀원(Team Member) |
| Requested | 요청 반영(팀장이 Schedule 수정) | Applied | 팀장(Team Leader) |
| Requested | 요청 반려 | Rejected | 팀장(Team Leader) |
| Applied / Rejected | — | (종결, 추가 전이 없음) | — |

- 상태 전이 주체는 권한 매트릭스(5장)와 일치한다: **요청 = 팀원**, **반영/반려 = 팀장**.
- Applied와 Rejected는 종결 상태이며, 종결된 요청은 재전이하지 않는다(필요 시 새 ScheduleChangeRequest를 생성).
- Applied 전이는 팀장이 대상 Schedule을 실제로 수정(또는 변경 수용)할 때 발생하며, 이때 변경 결과가 팀에 공유된다.

---

## 7. 도메인 이벤트

도메인 이벤트는 상태 변화의 사실을 표현하며, 알림(Notification) 생성과 변경 공유의 트리거가 된다.

| 이벤트 | 발생 시점 | 페이로드(요지) | 후속 동작(트리거) |
|---|---|---|---|
| **ScheduleCreated** | Schedule 신규 저장 시 | scheduleId, teamId, startAt, endAt | 충돌 검사 수행 |
| **ScheduleUpdated** | Schedule 수정 저장 시 | scheduleId, 변경 내용 | 충돌 검사 수행, 팀원에게 변경 공유 Notification |
| **ScheduleConflictDetected** | 충돌 판정(BR-07) 성립 시 | 충돌 대상 scheduleId 목록 | 팀장에게 충돌 경고 Notification 전달(BR-08) |
| **ScheduleChangeRequested** | ScheduleChangeRequest가 Requested로 생성될 때 | requestId, scheduleId, 요청자 | 팀장에게 요청 알림 Notification |
| **ScheduleChangeApplied** | ScheduleChangeRequest가 Applied로 전이될 때 | requestId, scheduleId | 요청자·팀에 반영 결과 공유 Notification |
| **ScheduleChangeRejected** | ScheduleChangeRequest가 Rejected로 전이될 때 | requestId, 반려 사유(선택) | 요청자에게 반려 통지 Notification |

> 알림(Notification)은 위 이벤트로부터 생성되며, 화면 내 통지를 1차 전달 형태로 한다. 모바일 푸시 고도화는 Out-of-Scope다(8장).

---

## 8. 주요 기능 (요구사항)

| ID | 기능 | 설명 |
|---|---|---|
| FR-01 | 사용자 인증 | 사용자가 인증을 거쳐 애플리케이션에 접근한다. |
| FR-02 | 팀/멤버십 관리 | 팀과 사용자의 소속·역할(팀장/팀원)을 관리한다. |
| FR-03 | 팀 일정 조회 | 월/주/일 뷰로 Schedule을 조회한다. |
| FR-04 | 팀 일정 등록 | 팀장이 Schedule을 추가하고 충돌 검사를 수행한다. |
| FR-05 | 팀 일정 수정/삭제 | 팀장이 Schedule을 수정·삭제한다. |
| FR-06 | 충돌 감지·경고 | 충돌을 감지하여 팀장에게 경고를 반환한다(저장은 유지). |
| FR-07 | 팀 채팅 및 일자별 이력 | ChatMessage 작성/조회 및 Daily Chat Log 조회. |
| FR-08 | 일정 변경 요청 | 팀원이 채팅으로 ScheduleChangeRequest를 생성한다. |
| FR-09 | 변경 요청 처리 | 팀장이 요청을 Applied/Rejected로 처리하고 결과를 공유한다. |

---

## 9. 주요 유스케이스 / 사용자 흐름

| ID | 유스케이스 | 흐름 |
|---|---|---|
| UC-01 | 로그인 및 팀 진입 | 사용자가 인증을 완료하고, 소속 팀의 캘린더와 채팅 화면에 진입한다. (BR-01, BR-02 적용) |
| UC-02 | 팀장의 일정 등록 | 팀장이 월/주/일 뷰에서 Schedule을 추가한다. 시스템이 유효성(BR-06)과 충돌(BR-07)을 검사하고, 충돌 시 Schedule은 저장하되 경고를 표시한다(BR-08). `ScheduleCreated`/`ScheduleConflictDetected` 발생. |
| UC-03 | 팀원의 일정 열람 | 팀원이 캘린더에서 Schedule을 조회한다(수정 불가). (BR-03 적용) |
| UC-04 | 채팅을 통한 변경 요청 | 팀원이 특정 Schedule에 대해 채팅으로 ScheduleChangeRequest를 생성한다. 상태는 **Requested**가 된다. 메시지는 해당 targetDate의 Daily Chat Log에 기록된다. `ScheduleChangeRequested` 발생. (BR-04, BR-05, BR-09 적용) |
| UC-05 | 팀장의 요청 반영 | 팀장이 Requested 상태의 요청을 확인하고, 수용 시 Schedule을 수정하여 요청을 **Applied**로 전이(`ScheduleChangeApplied`)하거나, 수용하지 않으면 **Rejected**로 전이(`ScheduleChangeRejected`)한다. 변경 결과가 모든 팀원에게 공유된다. (BR-03, BR-09 적용) |
| UC-06 | 일자별 채팅 조회 | 사용자가 특정 날짜를 선택해 그날의 일정과 관련된 Daily Chat Log를 함께 확인하며 맥락을 회수한다. (BR-05 적용) |

---

## 10. 수용 기준 (Acceptance Criteria)

핵심 규칙에 대한 Given-When-Then 형식 수용 기준이다.

### AC-01 충돌 감지 — 겹침 (BR-07, BR-08)
- **Given** 동일 팀에 `10:00~11:00` Schedule이 존재하고
- **When** 팀장이 `10:30~11:30` Schedule을 등록하면
- **Then** 충돌로 감지되어 새 Schedule은 저장되고, 팀장에게 충돌 경고가 반환된다.

### AC-02 충돌 감지 — 경계 접촉(경계값) (BR-07)
- **Given** 동일 팀에 `10:00~11:00` Schedule이 존재하고
- **When** 팀장이 `11:00~12:00` Schedule을 등록하면
- **Then** `A.endAt == B.startAt` 이므로 충돌이 아니며, 경고 없이 저장된다.

### AC-03 충돌 감지 — 자기 자신 제외 (BR-07)
- **Given** `10:00~11:00` Schedule(S1)이 존재하고
- **When** 팀장이 S1을 `10:00~11:30`으로 수정하면
- **Then** S1 자신은 비교에서 제외되어, 다른 겹치는 일정이 없는 한 충돌로 판정하지 않는다.

### AC-04 일정 유효성 — 경계값 (BR-06)
- **Given** 팀장이 Schedule을 등록하려 할 때
- **When** startAt과 endAt이 동일하거나 endAt이 startAt보다 이전이면
- **Then** 유효성 위반으로 거부되고 Schedule은 생성되지 않는다.

### AC-05 권한 거부 — 팀원의 일정 수정 시도 (BR-03)
- **Given** 팀원이 어떤 팀의 멤버이고
- **When** 팀원이 Schedule의 추가/수정/삭제를 시도하면
- **Then** 권한 부족으로 거부되고 Schedule은 변경되지 않는다.

### AC-06 인증/비멤버 차단 (BR-01, BR-02)
- **Given** 인증되지 않았거나 해당 팀의 멤버가 아닌 사용자가
- **When** 팀의 일정 또는 채팅 기능에 접근하면
- **Then** 접근이 거부된다.

### AC-07 변경 요청 상태 전이 — 반영 (BR-09)
- **Given** ScheduleChangeRequest가 **Requested** 상태이고
- **When** 팀장이 대상 Schedule을 수정하여 요청을 반영하면
- **Then** 요청 상태는 **Applied**로 전이되고 변경 결과가 팀에 공유된다.

### AC-08 변경 요청 상태 전이 — 권한/종결 (BR-09)
- **Given** ScheduleChangeRequest가 **Applied** 또는 **Rejected**(종결) 상태이고
- **When** 추가 전이를 시도하거나 팀원이 반영/반려를 시도하면
- **Then** 전이는 허용되지 않는다(종결 상태 불변, 처리 권한은 팀장 한정).

---

## 11. 범위 (Scope)

| 구분 | 내용 |
|---|---|
| **In-Scope** | 사용자 인증, 팀/멤버십 관리, 팀 단위 Schedule CRUD(권한 기반), 월/주/일 캘린더 뷰, 팀 채팅 및 Daily Chat Log, 채팅 기반 ScheduleChangeRequest, 일정 충돌 감지·경고, 화면 내 알림(Notification), 도메인 이벤트 기반 변경 공유 |
| **Out-of-Scope** | 개인 전용 캘린더, 외부 캘린더(Google/Outlook 등) 연동, 화상회의·파일공유, 결재/승인 워크플로우, 모바일 푸시 알림 고도화, 다중 팀 간 일정 통합 뷰, 반복 일정 |

---

## 12. 추적성 매트릭스

요구사항 ↔ 도메인 객체 ↔ 관련 규칙(BR) ↔ 유스케이스(UC) ↔ 수용 기준(AC)을 연결한다.

| 요구사항(FR) | 관련 도메인 객체(DM) | 관련 규칙(BR) | 유스케이스(UC) | 수용 기준(AC) |
|---|---|---|---|---|
| FR-01 사용자 인증 | DM-User | BR-01 | UC-01 | AC-06 |
| FR-02 팀/멤버십 관리 | DM-Team, DM-Membership | BR-02, BR-10 | UC-01 | AC-06 |
| FR-03 팀 일정 조회 | DM-Schedule | BR-02 | UC-03, UC-06 | AC-06 |
| FR-04 팀 일정 등록 | DM-Schedule | BR-03, BR-06, BR-07, BR-08 | UC-02 | AC-01, AC-02, AC-04 |
| FR-05 팀 일정 수정/삭제 | DM-Schedule | BR-03, BR-06, BR-07, BR-08 | UC-02, UC-05 | AC-03, AC-04, AC-05 |
| FR-06 충돌 감지·경고 | DM-Schedule, DM-Notification | BR-07, BR-08 | UC-02 | AC-01, AC-02, AC-03 |
| FR-07 팀 채팅·일자별 이력 | DM-ChatMessage | BR-02, BR-05 | UC-04, UC-06 | AC-06 |
| FR-08 일정 변경 요청 | DM-ScheduleChangeRequest, DM-ChatMessage | BR-04, BR-09 | UC-04 | AC-07 |
| FR-09 변경 요청 처리 | DM-ScheduleChangeRequest, DM-Schedule, DM-Notification | BR-03, BR-09 | UC-05 | AC-07, AC-08 |

---

## 13. 가정 및 향후 고려사항

- **가정**: 한 사용자는 여러 팀에 속할 수 있으나, 각 팀 내 역할은 단일하다(BR-10). 일정의 1차 책임자는 항상 팀장이다. 모든 일시는 UTC로 저장되며, 표시 시 사용자 시간대로 변환한다.
- **향후 고려사항**:
  - ScheduleChangeRequest에 대한 정식 승인 워크플로우 확장(다단계 결재)
  - 외부 캘린더 연동 및 실시간 알림(푸시) 강화
  - 일정 충돌 해소 자동 제안, 반복 일정(매주/매월) 지원
  - 팀장 권한 위임 및 다중 관리자 모델 검토

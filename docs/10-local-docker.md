# 로컬 Docker 실행 (전체 스택)

`docker compose` 한 번으로 PostgreSQL + 백엔드(API/WebSocket) + 프론트엔드(정적)까지 띄운다.
외부 계정·호스팅 없이 로컬에서 전체 동작을 확인하기 위한 구성이다(클라우드 배포 아님).

## 요구사항

- Docker Desktop (또는 Docker Engine) + Docker Compose v2

## 실행

```bash
# 저장소 루트에서
docker compose up --build
```

- 최초 실행 시 서버 컨테이너가 DB 준비를 기다린 뒤 **마이그레이션을 자동 적용**하고 기동한다.
- 접속:
  - 웹 앱: http://localhost:8080
  - API/WebSocket: http://localhost:3000 (`GET /health` 로 상태 확인)
  - PostgreSQL: `localhost:5432` (user/pass/db = `postgres`/`postgres`/`team_caltalk`)

종료:

```bash
docker compose down          # 컨테이너 정지/삭제 (DB 볼륨 유지)
docker compose down -v       # DB 볼륨까지 삭제(초기화)
```

## 구성 개요

| 서비스 | 이미지/빌드 | 포트 | 역할 |
|---|---|---|---|
| `postgres` | postgres:16 | 5432 | 데이터베이스(헬스체크 후 server 기동) |
| `server` | `server/Dockerfile` (node:20) | 3000 | Express API + socket.io. 기동 시 `node-pg-migrate up` 자동 실행 |
| `client` | `client/Dockerfile` (vite 빌드 → nginx) | 8080 | SPA 정적 서빙(SPA 폴백) |

## 네트워킹/환경변수 정합

브라우저는 `localhost:8080`(client)에서 로드되어 `localhost:3000`(server)로 REST/WS를 호출한다. 이에 맞춰:

- client 빌드: `VITE_API_BASE_URL=http://localhost:3000` (compose `build.args`)
- server: `CORS_ORIGIN=http://localhost:8080`, `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/team_caltalk`

> ⚠️ `docker-compose.yml`의 `JWT_ACCESS_SECRET`은 로컬 개발용 값이다. 실제 배포 시 반드시 32자 이상 난수로 교체하고 비밀 관리 도구로 주입한다.

## 첫 사용 흐름

1. http://localhost:8080 접속 → 회원가입(자동 로그인) → 워크스페이스 진입
2. `새 팀 이름` 입력 → `팀 생성`(생성자는 자동으로 팀장)
3. `일정 추가`로 일정 등록(겹치면 충돌 경고), 캘린더 날짜 선택 시 채팅이 해당 날짜로 동기화

## 참고/한계

- 본 구성은 **로컬 실행 전용**이다. 클라우드(예: Render/Vercel/Neon) 배포는 별도 설정이 필요하다.
- 이 환경(샌드박스)에는 Docker가 없어 이미지 빌드/기동은 **로컬에서 검증**해야 한다.

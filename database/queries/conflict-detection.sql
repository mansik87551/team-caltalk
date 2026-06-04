-- =============================================================================
-- 충돌 판정 조회 (BR-07) — 정규 쿼리
-- =============================================================================
-- 출처(SSOT) : docs/1-domain-definition.md BR-07 / AC-01~03, CLAUDE.md 아키텍처 불변식
-- 의미       : 같은 팀(team_id) 안에서 후보 일정 [candStart, candEnd) 과 시간이
--              겹치는 다른 일정을 찾는다.
--   겹침 정의 : A.start_at < B.end_at AND B.start_at < A.end_at   (엄격한 '<')
--               → 경계 접촉(A.end == B.start)은 충돌이 아니다(AC-02).
--   자기 제외 : schedule_id <> $self  (편집 중인 자기 자신 제외, AC-03)
--   UTC 분 단위: 모든 비교는 timestamptz(UTC) 기준. 종일 일정은 적재 시
--               [00:00, 익일 00:00) 반열린 구간으로 정규화되어 있어 동일 식으로 처리된다.
--
-- 바인딩 파라미터:
--   $1 = team_id              (uuid)
--   $2 = self_schedule_id     (uuid; 신규 생성 시 '00000000-0000-0000-0000-000000000000')
--   $3 = candidate start_at   (timestamptz, UTC)
--   $4 = candidate end_at     (timestamptz, UTC)
-- =============================================================================
SELECT schedule_id, title, start_at, end_at
FROM schedules
WHERE team_id = $1
  AND schedule_id <> $2          -- 자기 자신 제외 (AC-03)
  AND start_at < $4              -- 기존.start < 후보.end
  AND $3 < end_at                -- 후보.start < 기존.end   (엄격한 '<' → 경계 접촉 비충돌, AC-02)
ORDER BY start_at;

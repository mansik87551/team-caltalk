'use strict';

/**
 * 팀 입력 검증 스키마 (BE-06, zod)
 */

const { z } = require('zod');

const createTeamSchema = z.object({
  name: z.string().min(1, '팀명은 1자 이상이어야 합니다').max(100, '팀명은 100자 이하여야 합니다'),
});

// teamId 경로 파라미터 검증(가입·멤버 조회 공통)
const teamIdParamSchema = z.object({
  teamId: z.string().uuid('teamId 는 uuid 형식이어야 합니다'),
});

module.exports = { createTeamSchema, teamIdParamSchema };

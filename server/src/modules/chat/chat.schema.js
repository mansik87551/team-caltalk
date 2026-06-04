'use strict';

/**
 * 채팅 입력 검증 스키마 (BE-09, zod)
 */

const { z } = require('zod');

// YYYY-MM-DD 형식 날짜(date 전용). 시간대 변환 없이 그대로 target_date 로 사용.
const ymdDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다');

const createMessageSchema = z.object({
  content: z.string().min(1, '내용은 1자 이상이어야 합니다').max(2000, '내용은 2000자 이하여야 합니다'),
  targetDate: ymdDate.optional(),
});

const dateQuerySchema = z.object({
  date: ymdDate,
});

const teamIdParamSchema = z.object({
  teamId: z.string().uuid('teamId 는 uuid 형식이어야 합니다'),
});

module.exports = { createMessageSchema, dateQuerySchema, teamIdParamSchema };

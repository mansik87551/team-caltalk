'use strict';

/**
 * 일정 입력 검증 스키마 (BE-07, zod)
 *
 * - UTC ISO 8601 date-time 형식 검증. startAt<endAt 등 교차 규칙은 Service 의 도메인 검증에서 수행.
 */

const { z } = require('zod');

const isoDateTime = z.string().datetime({ offset: true, message: 'UTC ISO 8601 형식이어야 합니다' });

const createScheduleSchema = z.object({
  title: z.string().min(1, '제목은 1자 이상이어야 합니다').max(200),
  startAt: isoDateTime,
  endAt: isoDateTime,
  isAllDay: z.boolean().optional().default(false),
});

// 수정: 부분 업데이트 허용(모든 필드 선택). 최소 1개 필드는 있어야 한다.
const updateScheduleSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    startAt: isoDateTime.optional(),
    endAt: isoDateTime.optional(),
    isAllDay: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: '수정할 필드가 없습니다' });

const teamIdParamSchema = z.object({
  teamId: z.string().uuid('teamId 는 uuid 형식이어야 합니다'),
});

const scheduleParamsSchema = z.object({
  teamId: z.string().uuid('teamId 는 uuid 형식이어야 합니다'),
  scheduleId: z.string().uuid('scheduleId 는 uuid 형식이어야 합니다'),
});

const rangeQuerySchema = z.object({
  from: isoDateTime,
  to: isoDateTime,
});

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
  teamIdParamSchema,
  scheduleParamsSchema,
  rangeQuerySchema,
};

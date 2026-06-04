'use strict';

/**
 * 변경요청 입력 검증 스키마 (BE-10, zod)
 */

const { z } = require('zod');

const isoDateTime = z.string().datetime({ offset: true, message: 'UTC ISO 8601 형식이어야 합니다' });

// 생성: scheduleId·requestContent 필수, originMessageId 또는 content 중 최소 하나(핵심 차별점).
const createRequestSchema = z
  .object({
    scheduleId: z.string().uuid('scheduleId 는 uuid 형식이어야 합니다'),
    requestContent: z.string().min(1, '요청 내용은 1자 이상이어야 합니다').max(2000),
    originMessageId: z.string().uuid('originMessageId 는 uuid 형식이어야 합니다').optional(),
    content: z.string().min(1).max(2000).optional(),
  })
  .refine((o) => Boolean(o.originMessageId) || Boolean(o.content), {
    message: 'originMessageId 또는 content 중 하나는 필수입니다',
  });

// 처리: action 필수. applied 면 scheduleUpdate(최소 1개 필드) 필수.
const scheduleUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    startAt: isoDateTime.optional(),
    endAt: isoDateTime.optional(),
    isAllDay: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'scheduleUpdate 에 최소 1개 필드가 필요합니다' });

const processRequestSchema = z
  .object({
    action: z.enum(['applied', 'rejected'], { message: "action 은 'applied' 또는 'rejected' 여야 합니다" }),
    scheduleUpdate: scheduleUpdateSchema.optional(),
    rejectReason: z.string().max(500).optional(),
  })
  .refine((o) => o.action !== 'applied' || o.scheduleUpdate !== undefined, {
    message: 'applied 처리 시 scheduleUpdate 가 필요합니다',
  });

const teamIdParamSchema = z.object({
  teamId: z.string().uuid('teamId 는 uuid 형식이어야 합니다'),
});

const requestParamsSchema = z.object({
  teamId: z.string().uuid('teamId 는 uuid 형식이어야 합니다'),
  requestId: z.string().uuid('requestId 는 uuid 형식이어야 합니다'),
});

const statusQuerySchema = z.object({
  status: z.enum(['requested', 'applied', 'rejected']).optional(),
});

module.exports = {
  createRequestSchema,
  processRequestSchema,
  teamIdParamSchema,
  requestParamsSchema,
  statusQuerySchema,
};

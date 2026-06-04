/** 일정 폼 zod 스키마 (FE-08) — 클라이언트 유효성(AC-04/EX-03). */
import { z } from 'zod';

export const scheduleFormSchema = z
  .object({
    title: z.string().min(1, '제목을 입력하세요').max(200),
    // datetime-local 입력값('yyyy-MM-ddTHH:mm', KST 벽시계).
    startAt: z.string().min(1, '시작 일시를 입력하세요'),
    endAt: z.string().min(1, '종료 일시를 입력하세요'),
    isAllDay: z.boolean(),
  })
  .refine((v) => new Date(v.startAt) < new Date(v.endAt), {
    message: '종료 일시는 시작 일시보다 이후여야 합니다',
    path: ['endAt'],
  });

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

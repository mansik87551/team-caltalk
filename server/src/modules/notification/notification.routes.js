'use strict';

/**
 * 알림 라우터 (BE-11) — /api/notifications 하위에 마운트.
 *
 * - 팀 비종속 개인 리소스. authenticate 만으로 본인 알림에 접근(recipient = req.user).
 * - markRead 는 소유자 검증을 Service 가 수행(타인 403, 없음 404).
 */

const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../../utils/async-handler');
const { authenticate } = require('../../middlewares/authenticate');
const { validate } = require('../../middlewares/validate');
const notificationController = require('./notification.controller');

const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid('notificationId 는 uuid 형식이어야 합니다'),
});

const router = express.Router();

router.get('/', authenticate, asyncHandler(notificationController.list));

router.patch(
  '/:notificationId/read',
  authenticate,
  validate(notificationIdParamSchema, 'params'),
  asyncHandler(notificationController.markRead)
);

module.exports = router;

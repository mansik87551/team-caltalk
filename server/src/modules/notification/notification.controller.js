'use strict';

/**
 * 알림 컨트롤러 (BE-11)
 * - req/res 파싱·응답 직렬화만 담당.
 */

const notificationService = require('./notification.service');

// GET /api/notifications?unread=true
async function list(req, res) {
  const notifications = await notificationService.listNotifications({
    userId: req.user.userId,
    unreadOnly: req.query.unread === 'true' || req.query.unread === true,
  });
  res.status(200).json(notifications);
}

// PATCH /api/notifications/:notificationId/read
async function markRead(req, res) {
  const notification = await notificationService.markRead({
    userId: req.user.userId,
    notificationId: req.params.notificationId,
  });
  res.status(200).json(notification);
}

module.exports = { list, markRead };

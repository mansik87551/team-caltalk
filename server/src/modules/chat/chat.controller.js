'use strict';

/**
 * 채팅 컨트롤러 (BE-09)
 *
 * - req/res 파싱·응답 직렬화만 담당(검증은 라우트 validate 미들웨어).
 * - POST 201 ChatMessage, GET 200 ChatMessage[](Daily Chat Log).
 */

const chatService = require('./chat.service');

async function create(req, res) {
  const message = await chatService.createMessage({
    teamId: req.params.teamId,
    senderId: req.user.userId,
    content: req.body.content,
    targetDate: req.body.targetDate,
  });
  res.status(201).json(message);
}

async function list(req, res) {
  const messages = await chatService.listByDate({
    teamId: req.params.teamId,
    date: req.query.date,
  });
  res.status(200).json(messages);
}

module.exports = { create, list };

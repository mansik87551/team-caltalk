'use strict';

/**
 * 변경요청 컨트롤러 (BE-10)
 *
 * - req/res 파싱·응답 직렬화만 담당(검증은 라우트 validate 미들웨어).
 * - POST 201 SCR, GET 200 SCR[], PATCH 200 SCR.
 */

const scrService = require('./schedule-request.service');

async function create(req, res) {
  const scr = await scrService.createRequest({
    teamId: req.params.teamId,
    requesterId: req.user.userId,
    scheduleId: req.body.scheduleId,
    requestContent: req.body.requestContent,
    originMessageId: req.body.originMessageId,
    content: req.body.content,
  });
  res.status(201).json(scr);
}

async function list(req, res) {
  const requests = await scrService.listRequests({
    teamId: req.params.teamId,
    status: req.query.status,
  });
  res.status(200).json(requests);
}

async function process(req, res) {
  const scr = await scrService.processRequest({
    teamId: req.params.teamId,
    requestId: req.params.requestId,
    action: req.body.action,
    scheduleUpdate: req.body.scheduleUpdate,
    rejectReason: req.body.rejectReason,
    processedBy: req.user.userId,
  });
  res.status(200).json(scr);
}

module.exports = { create, list, process };

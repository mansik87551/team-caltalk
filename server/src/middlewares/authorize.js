'use strict';

/**
 * 권한 미들웨어 (BE-05, BR-02 / BR-03 / AC-05 / docs/4 §2.3 §5.2 Hard Rule)
 *
 * - requireMembership: URL :teamId 와 요청자 Membership 을 대조해 타팀 데이터 격리(BR-02).
 *   비멤버는 403. 통과 시 req.membership 주입.
 * - requireRole: 특정 역할만 허용(예: team_leader). req.membership 선행 필요.
 * - requirePermission: BE-03 domain/permissions.can(role, action) 으로 판정(BR-03).
 *   권한 매트릭스를 미들웨어에 복제하지 않고 도메인 순수함수를 재사용한다.
 *
 * 모든 권한 분기는 이 한 곳에 집중한다. Controller/프론트엔드에 복제 금지.
 * authenticate → requireMembership → requireRole|requirePermission 순으로 체인한다.
 */

const { AppError } = require('./error-handler');
const { can } = require('../domain/permissions');
const membershipRepository = require('../modules/membership/membership.repository');

/**
 * 요청자가 :teamId 팀의 멤버인지 확인하고 req.membership 을 주입한다(BR-02).
 * authenticate 이후에 위치해야 한다(req.user 필요).
 */
async function requireMembership(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return next(new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다'));
    }
    const teamId = req.params.teamId;
    if (!teamId) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'teamId 가 필요합니다'));
    }
    const membership = await membershipRepository.findByUserAndTeam(req.user.userId, teamId);
    if (!membership) {
      // 비멤버 또는 타팀 데이터 접근 시도 → 403(존재 여부를 흘리지 않도록 동일 응답).
      return next(new AppError(403, 'FORBIDDEN', '해당 팀에 대한 접근 권한이 없습니다'));
    }
    req.membership = membership;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * 허용된 역할만 통과시킨다. requireMembership 이후에 위치해야 한다.
 * @param {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.membership) {
      return next(new AppError(403, 'FORBIDDEN', '팀 멤버십 확인이 필요합니다'));
    }
    if (!allowedRoles.includes(req.membership.role)) {
      return next(new AppError(403, 'FORBIDDEN', '이 작업을 수행할 권한이 없습니다'));
    }
    return next();
  };
}

/**
 * 권한 매트릭스(BR-03)에 따라 action 수행 가능 여부를 판정한다.
 * requireMembership 이후에 위치해야 한다. 팀원의 Schedule CUD 등은 Service 진입 전 403 차단(AC-05).
 * @param {string} action - domain/permissions ACTION 상수
 */
function requirePermission(action) {
  return (req, res, next) => {
    if (!req.membership) {
      return next(new AppError(403, 'FORBIDDEN', '팀 멤버십 확인이 필요합니다'));
    }
    if (!can(req.membership.role, action)) {
      return next(new AppError(403, 'FORBIDDEN', '이 작업을 수행할 권한이 없습니다'));
    }
    return next();
  };
}

module.exports = { requireMembership, requireRole, requirePermission };

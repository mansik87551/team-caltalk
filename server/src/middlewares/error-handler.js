'use strict';

/**
 * 중앙 에러 처리 미들웨어 (BE-01, docs/4 §5.3)
 *
 * - 표준 에러 포맷: { error: { code, message } } (docs/4 컨벤션)
 * - 상태코드 매핑: 400 검증 / 401 인증 / 403 권한 / 404 / 409 충돌·상태전이 위반
 * - 도메인/서비스 계층은 AppError 를 throw 한다. 예상치 못한 에러는 500 으로 직렬화하되
 *   내부 메시지는 노출하지 않는다.
 */

/**
 * 운영 가능한(클라이언트에 코드/메시지를 노출해도 되는) 에러.
 * 서비스/도메인 계층에서 throw 하면 error-handler 가 그대로 직렬화한다.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP 상태코드
   * @param {string} code - 머신리더블 에러 코드(예: 'VALIDATION_ERROR')
   * @param {string} message - 사람이 읽는 메시지
   */
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// 자주 쓰는 팩토리 — 상태코드 매핑을 한곳에 모은다(docs/4 §5.3).
AppError.badRequest = (message = '잘못된 요청입니다', code = 'VALIDATION_ERROR') =>
  new AppError(400, code, message);
AppError.unauthorized = (message = '인증이 필요합니다', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);
AppError.forbidden = (message = '권한이 없습니다', code = 'FORBIDDEN') =>
  new AppError(403, code, message);
AppError.notFound = (message = '리소스를 찾을 수 없습니다', code = 'NOT_FOUND') =>
  new AppError(404, code, message);
AppError.conflict = (message = '충돌이 발생했습니다', code = 'CONFLICT') =>
  new AppError(409, code, message);

/**
 * 매칭되는 라우트가 없을 때 404 AppError 로 위임한다.
 * 라우트 등록 이후, error-handler 이전에 둔다.
 */
function notFoundHandler(req, res, next) {
  next(AppError.notFound(`경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`));
}

/**
 * Express 에러 핸들러(인자 4개 시그니처 필수).
 * @param {Error} err
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isApp = err instanceof AppError;
  const statusCode = isApp ? err.statusCode : 500;
  const code = isApp ? err.code : 'INTERNAL_ERROR';
  // 예상치 못한 500 에러는 내부 메시지를 노출하지 않는다.
  const message = isApp ? err.message : '서버 내부 오류가 발생했습니다';

  // 로그: 5xx 는 error, 그 외(클라이언트 귀책)는 warn. logger 가 있으면 사용.
  if (req.log) {
    const logFn = statusCode >= 500 ? req.log.error : req.log.warn;
    logFn.call(req.log, { err, statusCode, code }, message);
  }

  res.status(statusCode).json({ error: { code, message } });
}

module.exports = { AppError, notFoundHandler, errorHandler };

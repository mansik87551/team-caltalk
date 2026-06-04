'use strict';

/**
 * async 라우트 핸들러의 reject 를 Express 에러 체인으로 전파하는 래퍼 (BE-04)
 *
 * Express 4 는 async 핸들러에서 throw 된 에러를 자동으로 next 로 넘기지 않는다.
 * 이 래퍼로 감싸면 Promise rejection 이 중앙 error-handler 로 전달된다.
 *
 * @param {(req, res, next) => Promise<any>} fn
 * @returns {(req, res, next) => void}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;

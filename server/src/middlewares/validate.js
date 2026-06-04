'use strict';

/**
 * 입력 검증 미들웨어 (BE-05, docs/4 §2.3 §5.3)
 *
 * - zod 스키마로 req.body / req.params / req.query 를 검증한다.
 * - 위반 시 400 VALIDATION_ERROR + 필드 단위 details 를 반환한다.
 * - 통과 시 파싱·정규화된 값을 req[source] 에 되돌려 저장한다.
 */

const { AppError } = require('./error-handler');

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'params'|'query'} [source='body']
 * @returns {(req, res, next) => void}
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      const message = details.length ? details[0].message : '입력값이 올바르지 않습니다';
      return next(new AppError(400, 'VALIDATION_ERROR', message, details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };

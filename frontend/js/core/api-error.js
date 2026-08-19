/**
 * Failure classification for API responses.
 *
 * Views never inspect status codes: they receive an `ApiError` that already
 * says what kind of failure happened and, for validation errors, which fields
 * the server rejected.
 */

export const ERROR_KIND = {
  NETWORK: 'network',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'notFound',
  VALIDATION: 'validation',
  CONFLICT: 'conflict',
  SERVER: 'server',
  UNKNOWN: 'unknown',
};

export class ApiError extends Error {
  /**
   * @param {object} input
   * @param {number} input.status HTTP status, or 0 when the request never reached the server.
   * @param {string} input.kind One of `ERROR_KIND`.
   * @param {string} input.message Human-readable and already localized.
   * @param {Record<string, string>} [input.fieldErrors] Field name to message.
   */
  constructor({ status, kind, message, fieldErrors = {} }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }

  /** True when signing in again is what the person needs to do. */
  get needsSignIn() {
    return this.kind === ERROR_KIND.UNAUTHORIZED;
  }
}

export function classifyStatus(status) {
  if (status === 0) return ERROR_KIND.NETWORK;
  if (status === 401) return ERROR_KIND.UNAUTHORIZED;
  if (status === 403) return ERROR_KIND.FORBIDDEN;
  if (status === 404) return ERROR_KIND.NOT_FOUND;
  if (status === 409) return ERROR_KIND.CONFLICT;
  if (status === 422) return ERROR_KIND.VALIDATION;
  if (status >= 500) return ERROR_KIND.SERVER;
  return ERROR_KIND.UNKNOWN;
}

/**
 * Convert FastAPI's 422 `detail` array into a field-name keyed map.
 * The `body` / `query` prefix is dropped so keys match the form field names.
 */
export function extractFieldErrors(detail) {
  if (!Array.isArray(detail)) return {};
  const fieldErrors = {};
  for (const issue of detail) {
    const location = Array.isArray(issue?.loc) ? issue.loc : [];
    const field = location.filter((part) => part !== 'body' && part !== 'query').join('.') || '_';
    if (!fieldErrors[field] && issue?.msg) fieldErrors[field] = issue.msg;
  }
  return fieldErrors;
}

/**
 * Describe a failed response without deciding how to phrase it.
 *
 * @returns {{ kind: string, detail: string|null, fieldErrors: Record<string, string> }}
 *   `detail` is the server's own message when it sent a plain string, which the
 *   caller can look up in the translations before falling back to a generic text.
 */
export function describeFailure(status, payload) {
  const detail = payload?.detail;
  return {
    kind: classifyStatus(status),
    detail: typeof detail === 'string' && detail.trim() ? detail : null,
    fieldErrors: extractFieldErrors(detail),
  };
}

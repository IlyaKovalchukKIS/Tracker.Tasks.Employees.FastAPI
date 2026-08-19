/**
 * HTTP transport for the Employee Task Management API.
 *
 * Attaches the bearer token, rotates an expired access token once per request,
 * and converts every failure into a localized `ApiError`.
 */

import { ApiError, ERROR_KIND, describeFailure } from './api-error.js';
import { serverMessage, t, validationMessage } from './i18n.js';
import { tokens } from './tokens.js';

let onSessionExpired = () => {};

/** Register the handler invoked when the refresh token is no longer usable. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

function buildUrl(path, query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Phrase a failure in the active language, preferring the server's own wording. */
function localize({ kind, detail, fieldErrors }, status) {
  const translatedFields = Object.fromEntries(
    Object.entries(fieldErrors).map(([field, message]) => [field, validationMessage(message)]),
  );

  if (Object.keys(translatedFields).length > 0) {
    return new ApiError({ status, kind, message: t('error.kind.validation'), fieldErrors: translatedFields });
  }

  const message = detail ? serverMessage(detail) : t(`error.kind.${kind}`);
  return new ApiError({ status, kind, message, fieldErrors: {} });
}

async function toApiError(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* empty or non-JSON error body */
  }
  return localize(describeFailure(response.status, payload), response.status);
}

let refreshInFlight = null;

/** Exchange the stored refresh token for a new pair, at most once concurrently. */
function refreshSession() {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = tokens.refresh;
  if (!refreshToken) return Promise.resolve(false);

  refreshInFlight = fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) return false;
      tokens.save(await response.json());
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * Send a request and return the parsed body, or `null` for an empty response.
 *
 * @throws {ApiError} for network failures and every non-2xx response.
 */
export async function request(path, { method = 'GET', body, query, auth = true, retryOn401 = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({ status: 0, kind: ERROR_KIND.NETWORK, message: t('error.kind.network') });
  }

  if (response.status === 401 && auth && retryOn401) {
    if (await refreshSession()) {
      return request(path, { method, body, query, auth, retryOn401: false });
    }
    tokens.clear();
    onSessionExpired();
    throw new ApiError({
      status: 401,
      kind: ERROR_KIND.UNAUTHORIZED,
      message: t('auth.sessionExpired'),
    });
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * HTTP client for the Employee Task Management API.
 *
 * Adds the bearer token to every protected call, transparently rotates the
 * refresh token when an access token expires, and turns API error payloads into
 * a single `ApiError` shape the views can render.
 */

import { serverMessage, t } from './i18n.js';

const ACCESS_KEY = 'tracker.accessToken';
const REFRESH_KEY = 'tracker.refreshToken';

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status, or 0 when the request never reached the server.
   * @param {string} message Human-readable, already localized.
   * @param {Record<string, string>} fieldErrors Field name to message, from 422 responses.
   */
  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the session lives for this page only */
  }
}

export const tokens = {
  get access() {
    return read(ACCESS_KEY);
  },
  get refresh() {
    return read(REFRESH_KEY);
  },
  save({ access_token, refresh_token }) {
    write(ACCESS_KEY, access_token);
    write(REFRESH_KEY, refresh_token);
  },
  clear() {
    write(ACCESS_KEY, null);
    write(REFRESH_KEY, null);
  },
};

export function isAuthenticated() {
  return Boolean(tokens.access);
}

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

/** Convert a FastAPI 422 `detail` array into a field-name keyed map. */
function collectFieldErrors(detail) {
  const fieldErrors = {};
  for (const issue of detail) {
    const location = Array.isArray(issue?.loc) ? issue.loc : [];
    const field = location.filter((part) => part !== 'body').join('.') || '_';
    if (!fieldErrors[field]) fieldErrors[field] = issue?.msg || t('error.generic');
  }
  return fieldErrors;
}

async function toApiError(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* empty or non-JSON error body */
  }
  const detail = payload?.detail;

  if (Array.isArray(detail)) {
    const fieldErrors = collectFieldErrors(detail);
    const first = Object.values(fieldErrors)[0];
    return new ApiError(response.status, first || t('error.generic'), fieldErrors);
  }
  if (typeof detail === 'string') {
    return new ApiError(response.status, serverMessage(detail));
  }
  return new ApiError(response.status, t('error.generic'));
}

let refreshInFlight = null;

/** Exchange the stored refresh token for a new pair, at most once concurrently. */
function refreshTokens() {
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

async function request(path, { method = 'GET', body, query, auth = true, retryOn401 = true } = {}) {
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
    throw new ApiError(0, t('error.network'));
  }

  if (response.status === 401 && auth && retryOn401) {
    if (await refreshTokens()) {
      return request(path, { method, body, query, auth, retryOn401: false });
    }
    tokens.clear();
    onSessionExpired();
    throw new ApiError(401, t('auth.sessionExpired'));
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export const auth = {
  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: { email, password }, auth: false }),

  async login(email, password) {
    const pair = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    tokens.save(pair);
    return pair;
  },

  /** Revoke the refresh token server-side; local tokens are dropped either way. */
  async logout() {
    const refreshToken = tokens.refresh;
    tokens.clear();
    if (!refreshToken) return;
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        auth: false,
      });
    } catch {
      /* the local session is already gone; a failed revoke must not block logout */
    }
  },
};

export const users = {
  me: () => request('/users/me'),
  updateMe: (payload) => request('/users/me', { method: 'PATCH', body: payload }),
  list: () => request('/users'),
  get: (id) => request(`/users/${id}`),
  update: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export const employees = {
  list: () => request('/employees'),
  get: (id) => request(`/employees/${id}`),
};

export const tasks = {
  list: (query) => request('/tasks', { query }),
  get: (id) => request(`/tasks/${id}`),
  create: (payload) => request('/tasks', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};

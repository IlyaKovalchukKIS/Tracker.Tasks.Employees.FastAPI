/**
 * Every endpoint of the Employee Task Management API, in one place.
 *
 * Views call these functions instead of building URLs, so the routes and the
 * request shapes stay in a single file.
 */

import { request } from './http.js';
import { tokens } from './tokens.js';

export const auth = {
  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: { email, password }, auth: false }),

  async login(email, password) {
    const pair = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    tokens.save(pair);
    return pair;
  },

  /** Revoke the refresh token server-side; the local session is dropped either way. */
  async logout() {
    const refreshToken = tokens.refresh;
    tokens.clear();
    if (!refreshToken) return;
    try {
      await request('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken }, auth: false });
    } catch {
      /* the local session is already gone; a failed revoke must not block sign-out */
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

  /**
   * Number of tasks matching a filter, without transferring the tasks
   * themselves. Used by the dashboard and the status counters.
   */
  async count(query = {}) {
    const response = await tasks.list({ ...query, page: 1, limit: 1 });
    return response.total;
  },
};

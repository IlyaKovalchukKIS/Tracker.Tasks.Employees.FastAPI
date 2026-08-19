/**
 * Cache of user records, so task lists can show an email instead of a raw id.
 *
 * Managers and administrators can fetch the whole directory in one request.
 * Employees cannot, so unknown ids are looked up individually and remembered
 * as misses to avoid repeating a request the API will refuse again.
 */

import { employees as employeesApi } from './api.js';
import { canViewDirectory } from './permissions.js';
import { getUser } from './session.js';

const cache = new Map();
let listPromise = null;

export function primeUser(user) {
  if (user?.id) cache.set(user.id, user);
}

export const primeUsers = (list = []) => list.forEach(primeUser);

export function invalidateDirectory() {
  listPromise = null;
}

/** Full directory for roles allowed to list it; `[]` for everyone else. */
export async function loadDirectory({ force = false } = {}) {
  if (!canViewDirectory(getUser())) return [];
  if (force) listPromise = null;
  if (!listPromise) {
    listPromise = employeesApi
      .list()
      .then((list) => {
        primeUsers(list);
        return list;
      })
      .catch(() => {
        listPromise = null;
        return [];
      });
  }
  return listPromise;
}

/** Fill the cache for `ids` so `labelFor` can render synchronously afterwards. */
export async function resolveUsers(ids) {
  const missing = [...new Set(ids.filter((id) => id && !cache.has(id)))];
  if (missing.length === 0) return;

  await loadDirectory();

  const stillMissing = missing.filter((id) => !cache.has(id));
  await Promise.all(
    stillMissing.map((id) =>
      employeesApi
        .get(id)
        .then(primeUser)
        .catch(() => cache.set(id, null)),
    ),
  );
}

/** Email for a known id, `#id` when the caller may not read that user. */
export function labelFor(id) {
  if (!id) return null;
  return cache.get(id)?.email ?? `#${id}`;
}

/** Cached user record, or `null` when the id is unknown or not visible. */
export function getCachedUser(id) {
  if (!id) return null;
  return cache.get(id) || null;
}

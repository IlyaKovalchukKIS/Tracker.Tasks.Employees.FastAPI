/**
 * The signed-in user, kept in memory for the lifetime of the page.
 *
 * The profile is fetched from `GET /users/me` after sign-in and drives every
 * role-aware decision in the interface.
 */

const listeners = new Set();
let currentUser = null;

export const getUser = () => currentUser;

export function setUser(user) {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
  return user;
}

export const clearUser = () => setUser(null);

/** Subscribe to profile changes; returns an unsubscribe function. */
export function onUserChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

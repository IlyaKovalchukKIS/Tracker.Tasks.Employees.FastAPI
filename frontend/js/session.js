/**
 * Current user state, kept in memory for the lifetime of the page.
 */

let currentUser = null;

export function getUser() {
  return currentUser;
}

export function setUser(user) {
  currentUser = user;
  return user;
}

export function clearUser() {
  currentUser = null;
}

export const isAdmin = () => currentUser?.role === 'ADMIN';
export const isManager = () => currentUser?.role === 'MANAGER';

/** True for roles that may create tasks and browse the employee directory. */
export const canManageWork = () => isAdmin() || isManager();

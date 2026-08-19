/**
 * Local storage access that degrades to a no-op.
 *
 * Private browsing modes and blocked third-party storage make `localStorage`
 * throw, which must never break the application: the session simply lasts for
 * the lifetime of the page instead.
 */

export const STORAGE_KEYS = {
  accessToken: 'tracker.accessToken',
  refreshToken: 'tracker.refreshToken',
  theme: 'tracker.theme',
  locale: 'tracker.locale',
};

export function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

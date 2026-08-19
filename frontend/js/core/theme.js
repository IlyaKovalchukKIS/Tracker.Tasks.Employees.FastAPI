/**
 * Light and dark theme selection.
 *
 * The stored theme is applied by an inline script in `index.html` before the
 * first paint; this module only handles changes made while the app is running.
 */

import { STORAGE_KEYS, writeStored } from './storage.js';

export const getTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  writeStored(STORAGE_KEYS.theme, next);
  return next;
}

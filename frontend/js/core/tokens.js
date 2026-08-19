/**
 * Storage of the JWT access token and the rotating refresh token.
 *
 * Tokens are read through this module only, so they never end up rendered in
 * the interface or logged.
 */

import { STORAGE_KEYS, readStored, writeStored } from './storage.js';

export const tokens = {
  get access() {
    return readStored(STORAGE_KEYS.accessToken);
  },

  get refresh() {
    return readStored(STORAGE_KEYS.refreshToken);
  },

  save({ access_token: accessToken, refresh_token: refreshToken }) {
    writeStored(STORAGE_KEYS.accessToken, accessToken);
    writeStored(STORAGE_KEYS.refreshToken, refreshToken);
  },

  clear() {
    writeStored(STORAGE_KEYS.accessToken, null);
    writeStored(STORAGE_KEYS.refreshToken, null);
  },
};

/** A stored access token means a session can be attempted, not that it is valid. */
export const hasSession = () => Boolean(tokens.access);

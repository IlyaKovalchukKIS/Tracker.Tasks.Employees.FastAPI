/**
 * Client-side validation mirroring the API's Pydantic constraints, so obvious
 * mistakes are reported before a request is sent.
 */

import { t } from './i18n.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 5000;

export function validateEmail(value) {
  if (!value.trim()) return t('validation.required');
  if (!EMAIL_PATTERN.test(value.trim())) return t('validation.email');
  return null;
}

export function validatePassword(value) {
  if (!value) return t('validation.required');
  if (value.length < MIN_PASSWORD_LENGTH) return t('validation.tooShort', { min: MIN_PASSWORD_LENGTH });
  return null;
}

export function validateRequired(value, { max } = {}) {
  if (!value.trim()) return t('validation.required');
  if (max && value.trim().length > max) return t('validation.tooLong', { max });
  return null;
}

/** Drop keys with no message so callers can test emptiness with `Object.keys`. */
export const compact = (errors) =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));

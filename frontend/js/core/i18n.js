/**
 * Translation lookup, locale persistence, and locale-aware formatting.
 *
 * Every user-facing string comes from a dictionary, so the interface can switch
 * between English and Russian on any page without a reload.
 */

import en from './locales/en.js';
import ru from './locales/ru.js';
import { STORAGE_KEYS, readStored, writeStored } from './storage.js';
import { DAY_MS, HOUR_MS, parseTimestamp } from './time.js';

const DEFAULT_LOCALE = 'en';
const dictionaries = { en, ru };

export const LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
];

function detectLocale() {
  const stored = readStored(STORAGE_KEYS.locale);
  if (stored && dictionaries[stored]) return stored;
  const preferred = (navigator.languages || [navigator.language || '']).map((tag) =>
    String(tag).slice(0, 2).toLowerCase(),
  );
  return preferred.find((code) => dictionaries[code]) || DEFAULT_LOCALE;
}

let locale = detectLocale();
const listeners = new Set();

export const getLocale = () => locale;

/** Subscribe to locale changes; returns an unsubscribe function. */
export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(next) {
  if (!dictionaries[next] || next === locale) return;
  locale = next;
  writeStored(STORAGE_KEYS.locale, next);
  document.documentElement.lang = next;
  listeners.forEach((listener) => listener(next));
}

/**
 * Translate `key`, replacing `{placeholders}` with `vars`.
 *
 * Unknown keys fall back to English and then to the key itself, so a missing
 * translation is visible during development instead of rendering blank.
 */
export function t(key, vars) {
  const template = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  );
}

export const taskStatusLabel = (status) => t(`task.status.${status}`);
export const taskPriorityLabel = (priority) => t(`task.priority.${priority}`);
export const roleLabel = (role) => t(`role.${role}`);

/** Translate a `detail` string returned by the API, falling back to the raw text. */
export function serverMessage(detail) {
  if (!detail) return t('error.kind.unknown');
  const key = `server.${detail}`;
  return dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? detail;
}

const VALIDATION_PATTERNS = [
  [/field required/i, () => t('validation.required')],
  [/valid email/i, () => t('validation.email')],
  [/at least (\d+) characters?/i, (match) => t('validation.tooShort', { min: match[1] })],
  [/at most (\d+) characters?/i, (match) => t('validation.tooLong', { max: match[1] })],
];

/** Translate the common Pydantic validation messages, keeping the rest as sent. */
export function validationMessage(raw) {
  if (!raw) return t('validation.invalid');
  for (const [pattern, build] of VALIDATION_PATTERNS) {
    const match = pattern.exec(raw);
    if (match) return build(match);
  }
  return raw;
}

/** Apply translations to static markup annotated with `data-i18n*` attributes. */
export function translateDocument(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  });
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const formatterCache = new Map();

function formatter(kind, options) {
  const key = `${locale}:${kind}:${JSON.stringify(options)}`;
  if (!formatterCache.has(key)) {
    const Ctor = { date: Intl.DateTimeFormat, number: Intl.NumberFormat, relative: Intl.RelativeTimeFormat }[kind];
    formatterCache.set(key, new Ctor(locale, options));
  }
  return formatterCache.get(key);
}

const DATE_FORMATS = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  dayMonth: { day: 'numeric', month: 'short' },
};

/** Format an API timestamp in the active locale, or return a dash when absent. */
export function formatDate(value, { withTime = false, compact = false } = {}) {
  const date = parseTimestamp(value);
  if (!date) return '—';
  const style = compact ? 'dayMonth' : withTime ? 'dateTime' : 'date';
  return formatter('date', DATE_FORMATS[style]).format(date);
}

const RELATIVE_UNITS = [
  ['year', 365 * DAY_MS],
  ['month', 30 * DAY_MS],
  ['week', 7 * DAY_MS],
  ['day', DAY_MS],
  ['hour', HOUR_MS],
  ['minute', 60 * 1000],
];

/** "in 3 days", "2 hours ago" — the wording deadlines and activity read best in. */
export function formatRelative(value, now = Date.now()) {
  const date = parseTimestamp(value);
  if (!date) return '—';
  const diff = date.getTime() - now;
  const absolute = Math.abs(diff);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (absolute >= size) {
      return formatter('relative', { numeric: 'auto' }).format(Math.round(diff / size), unit);
    }
  }
  return t('time.justNow');
}

export const formatNumber = (value) => formatter('number', {}).format(value);

export const formatPercent = (ratio) =>
  formatter('number', { style: 'percent', maximumFractionDigits: 0 }).format(ratio);

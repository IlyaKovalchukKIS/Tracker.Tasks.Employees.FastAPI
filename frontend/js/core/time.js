/**
 * Timestamp conversion between the API, JavaScript dates, and form controls.
 */

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse an API timestamp into a Date, or `null` when it is absent or invalid.
 *
 * The API stores UTC, but depending on the database driver it may serialize
 * without an offset. JavaScript would read such a value as local time, so the
 * missing designator is added back before parsing.
 */
export function parseTimestamp(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' && !HAS_OFFSET.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (value) => String(value).padStart(2, '0');

/** Format an API timestamp for an `<input type="datetime-local">`. */
export function toLocalInputValue(iso) {
  const date = parseTimestamp(iso);
  if (!date) return '';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Convert a `datetime-local` value back into an ISO string, or `null`. */
export function fromLocalInputValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const HOUR_MS = 3600 * 1000;
export const DAY_MS = 24 * HOUR_MS;

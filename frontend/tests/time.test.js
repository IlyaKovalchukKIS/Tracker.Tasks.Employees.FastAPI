/**
 * Timestamp conversion between the API and `<input type="datetime-local">`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromLocalInputValue, parseTimestamp, toLocalInputValue } from '../js/core/time.js';

describe('parseTimestamp', () => {
  it('parses an ISO timestamp with an offset', () => {
    assert.equal(parseTimestamp('2026-03-10T12:00:00Z').toISOString(), '2026-03-10T12:00:00.000Z');
    assert.equal(parseTimestamp('2026-03-10T15:00:00+03:00').toISOString(), '2026-03-10T12:00:00.000Z');
  });

  it('treats a timestamp without an offset as UTC, matching the API', () => {
    assert.equal(parseTimestamp('2026-03-10T12:00:00').toISOString(), '2026-03-10T12:00:00.000Z');
  });

  it('returns null for missing or unparseable values', () => {
    assert.equal(parseTimestamp(null), null);
    assert.equal(parseTimestamp(''), null);
    assert.equal(parseTimestamp('not a date'), null);
  });
});

describe('form values', () => {
  it('round-trips a timestamp through the deadline field', () => {
    const iso = '2026-03-10T12:30:00Z';
    const roundTripped = fromLocalInputValue(toLocalInputValue(iso));
    // The control has minute precision and works in local time; the instant is
    // preserved even though the text form is not.
    assert.equal(Date.parse(roundTripped), Date.parse(iso));
  });

  it('pads month, day, hour, and minute to two digits', () => {
    const local = toLocalInputValue(new Date(2026, 0, 5, 9, 7).toISOString());
    assert.equal(local, '2026-01-05T09:07');
  });

  it('treats an empty deadline as no deadline', () => {
    assert.equal(toLocalInputValue(null), '');
    assert.equal(fromLocalInputValue(''), null);
    assert.equal(fromLocalInputValue('nonsense'), null);
  });
});

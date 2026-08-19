/**
 * Task list state: reading filters from a link, writing them back, and turning
 * them into the query parameters `GET /tasks` accepts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  activeFilters,
  clearFilters,
  hasActiveFilters,
  normalizeSort,
  pageCount,
  parseFilters,
  parseSort,
  serializeFilters,
  toRequestParams,
  toggleSort,
  withoutFilter,
} from '../js/core/task-filters.js';

const parse = (search) => parseFilters(new URLSearchParams(search));

describe('parsing filters from the address bar', () => {
  it('falls back to defaults when nothing is set', () => {
    assert.deepEqual(parse(''), { ...EMPTY_FILTERS });
  });

  it('reads every supported filter', () => {
    const filters = parse('page=3&status=DONE&priority=HIGH&employee_id=7&search=report&sort=deadline');
    assert.equal(filters.page, 3);
    assert.equal(filters.status, 'DONE');
    assert.equal(filters.priority, 'HIGH');
    assert.equal(filters.employeeId, '7');
    assert.equal(filters.search, 'report');
    assert.equal(filters.sort, 'deadline');
  });

  it('ignores values the API would reject', () => {
    const filters = parse('page=-2&status=ARCHIVED&priority=URGENT&employee_id=abc&sort=hacked');
    assert.equal(filters.page, 1);
    assert.equal(filters.status, '');
    assert.equal(filters.priority, '');
    assert.equal(filters.employeeId, '');
    assert.equal(filters.sort, DEFAULT_SORT);
  });

  it('reads the unassigned flag only when it is exactly "true"', () => {
    assert.equal(parse('unassigned=true').unassigned, true);
    assert.equal(parse('unassigned=1').unassigned, false);
  });
});

describe('serializing filters', () => {
  it('writes nothing when every filter is at its default', () => {
    assert.equal(serializeFilters(EMPTY_FILTERS), '');
  });

  it('round-trips through the address bar', () => {
    const filters = { ...EMPTY_FILTERS, page: 2, status: 'TODO', search: 'payroll report', sort: 'title' };
    assert.deepEqual(parse(serializeFilters(filters)), filters);
  });

  it('trims the search term', () => {
    assert.equal(serializeFilters({ ...EMPTY_FILTERS, search: '  report  ' }), 'search=report');
  });
});

describe('request parameters', () => {
  it('sends null instead of empty filters so the client omits them', () => {
    const params = toRequestParams(EMPTY_FILTERS);
    assert.equal(params.status, null);
    assert.equal(params.priority, null);
    assert.equal(params.employee_id, null);
    assert.equal(params.unassigned, null);
    assert.equal(params.search, null);
    assert.equal(params.sort, DEFAULT_SORT);
    assert.equal(params.page, 1);
  });

  it('passes the selected filters through', () => {
    const params = toRequestParams({ ...EMPTY_FILTERS, status: 'DONE', unassigned: true, search: ' x ' });
    assert.equal(params.status, 'DONE');
    assert.equal(params.unassigned, 'true');
    assert.equal(params.search, 'x');
  });

  it('honours a custom page size', () => {
    assert.equal(toRequestParams(EMPTY_FILTERS, { pageSize: 50 }).limit, 50);
  });
});

describe('sorting', () => {
  it('splits a sort string into field and direction', () => {
    assert.deepEqual(parseSort('-deadline'), { field: 'deadline', direction: 'desc' });
    assert.deepEqual(parseSort('title'), { field: 'title', direction: 'asc' });
  });

  it('rejects fields the API does not allow', () => {
    assert.equal(normalizeSort('-secret_column'), DEFAULT_SORT);
    assert.equal(normalizeSort(''), DEFAULT_SORT);
  });

  it('sorts a new column ascending and reverses the active one', () => {
    assert.equal(toggleSort('-created_at', 'title'), 'title');
    assert.equal(toggleSort('title', 'title'), '-title');
    assert.equal(toggleSort('-title', 'title'), 'title');
  });
});

describe('active filters', () => {
  it('counts only the filters that narrow the list', () => {
    assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, page: 4, sort: 'title' }), false);
    assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, status: 'TODO' }), true);
  });

  it('lists each active filter once', () => {
    const filters = { ...EMPTY_FILTERS, status: 'TODO', search: 'a', unassigned: true };
    assert.deepEqual(activeFilters(filters).map((entry) => entry.key), ['search', 'status', 'unassigned']);
  });

  it('removes a single filter and returns to the first page', () => {
    const filters = { ...EMPTY_FILTERS, page: 5, status: 'TODO', priority: 'HIGH' };
    const next = withoutFilter(filters, 'status');
    assert.equal(next.status, '');
    assert.equal(next.priority, 'HIGH');
    assert.equal(next.page, 1);
  });

  it('keeps the sort order when clearing everything', () => {
    const cleared = clearFilters({ ...EMPTY_FILTERS, status: 'TODO', sort: 'title', page: 3 });
    assert.deepEqual(cleared, { ...EMPTY_FILTERS, sort: 'title' });
  });
});

describe('page count', () => {
  it('rounds up and never drops below one page', () => {
    assert.equal(pageCount({ total: 0, limit: 20 }), 1);
    assert.equal(pageCount({ total: 20, limit: 20 }), 1);
    assert.equal(pageCount({ total: 21, limit: 20 }), 2);
  });
});

/**
 * Task list state: filters, sorting, and pagination.
 *
 * The state is kept in the address bar so a filtered view can be bookmarked or
 * shared, and it is translated into the query parameters accepted by
 * `GET /tasks` in exactly one place.
 */

import { SORTABLE_FIELDS, TASK_PRIORITIES, TASK_STATUSES } from './domain.js';

export const PAGE_SIZE = 20;
export const DEFAULT_SORT = '-created_at';

/** Filters that hold no selection, used as the reset target. */
export const EMPTY_FILTERS = Object.freeze({
  page: 1,
  status: '',
  priority: '',
  employeeId: '',
  unassigned: false,
  search: '',
  sort: DEFAULT_SORT,
});

const oneOf = (value, allowed) => (allowed.includes(value) ? value : '');

/** Normalize a raw sort string, falling back to the default when unsupported. */
export function normalizeSort(raw) {
  if (typeof raw !== 'string' || raw === '') return DEFAULT_SORT;
  const descending = raw.startsWith('-');
  const field = raw.replace(/^[+-]/, '');
  if (!SORTABLE_FIELDS.includes(field)) return DEFAULT_SORT;
  return descending ? `-${field}` : field;
}

export function parseSort(raw) {
  const sort = normalizeSort(raw);
  return sort.startsWith('-')
    ? { field: sort.slice(1), direction: 'desc' }
    : { field: sort, direction: 'asc' };
}

/**
 * Sort string produced by clicking a column header: the first click sorts a
 * column ascending, clicking the active column again reverses it.
 */
export function toggleSort(currentSort, field) {
  if (!SORTABLE_FIELDS.includes(field)) return normalizeSort(currentSort);
  const current = parseSort(currentSort);
  if (current.field !== field) return field;
  return current.direction === 'asc' ? `-${field}` : field;
}

/** Read filters from the route's query string. Invalid values are ignored. */
export function parseFilters(params) {
  const get = (key) => params?.get(key) ?? '';
  const page = Number.parseInt(get('page'), 10);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    status: oneOf(get('status'), TASK_STATUSES),
    priority: oneOf(get('priority'), TASK_PRIORITIES),
    employeeId: /^\d+$/.test(get('employee_id')) ? get('employee_id') : '',
    unassigned: get('unassigned') === 'true',
    search: get('search').slice(0, 100),
    sort: normalizeSort(get('sort')),
  };
}

/** Serialize filters back to a query string, omitting everything at default. */
export function serializeFilters(filters) {
  const params = new URLSearchParams();
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.employeeId) params.set('employee_id', String(filters.employeeId));
  if (filters.unassigned) params.set('unassigned', 'true');
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (normalizeSort(filters.sort) !== DEFAULT_SORT) params.set('sort', normalizeSort(filters.sort));
  return params.toString();
}

/** Query parameters for `GET /tasks`; empty values are dropped by the client. */
export function toRequestParams(filters, { pageSize = PAGE_SIZE } = {}) {
  return {
    page: filters.page,
    limit: pageSize,
    status: filters.status || null,
    priority: filters.priority || null,
    employee_id: filters.employeeId || null,
    unassigned: filters.unassigned ? 'true' : null,
    search: filters.search.trim() || null,
    sort: normalizeSort(filters.sort),
  };
}

/**
 * The filters a person actively chose, as `{ key, value }` pairs.
 * Sorting and pagination are excluded: they refine a view rather than narrow it.
 */
export function activeFilters(filters) {
  const active = [];
  if (filters.search.trim()) active.push({ key: 'search', value: filters.search.trim() });
  if (filters.status) active.push({ key: 'status', value: filters.status });
  if (filters.priority) active.push({ key: 'priority', value: filters.priority });
  if (filters.employeeId) active.push({ key: 'employeeId', value: filters.employeeId });
  if (filters.unassigned) active.push({ key: 'unassigned', value: true });
  return active;
}

export const hasActiveFilters = (filters) => activeFilters(filters).length > 0;

/** Clear every filter while keeping the chosen sort order. */
export const clearFilters = (filters) => ({ ...EMPTY_FILTERS, sort: normalizeSort(filters.sort) });

/** Remove a single filter, as used by the dismissible filter chips. */
export function withoutFilter(filters, key) {
  const next = { ...filters, page: 1 };
  if (key === 'unassigned') next.unassigned = false;
  else next[key] = '';
  return next;
}

/** Total number of pages for a `TaskListResponse`, never below one. */
export const pageCount = ({ total = 0, limit = PAGE_SIZE } = {}) =>
  Math.max(1, Math.ceil(total / Math.max(1, limit)));

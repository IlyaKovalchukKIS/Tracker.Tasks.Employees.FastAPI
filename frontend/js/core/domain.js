/**
 * Domain vocabulary shared by the whole client.
 *
 * The values mirror the API enumerations (`UserRole`, `TaskStatus`,
 * `TaskPriority`). The tone maps translate a domain value into the semantic
 * colour used by badges and charts, so a status is coloured the same way
 * everywhere in the interface.
 */

export const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** Statuses that take a task out of the active workload. */
export const CLOSED_STATUSES = new Set(['DONE', 'CANCELLED']);

/** Statuses that still represent work in flight. */
export const OPEN_STATUSES = TASK_STATUSES.filter((status) => !CLOSED_STATUSES.has(status));

export const STATUS_TONE = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
  CANCELLED: 'muted',
};

export const PRIORITY_TONE = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export const ROLE_TONE = {
  ADMIN: 'accent',
  MANAGER: 'info',
  EMPLOYEE: 'neutral',
};

/** Fields the API accepts in the `sort` query parameter. */
export const SORTABLE_FIELDS = ['id', 'title', 'status', 'priority', 'deadline', 'created_at', 'updated_at'];

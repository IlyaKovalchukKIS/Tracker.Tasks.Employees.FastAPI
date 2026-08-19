/**
 * Deadline interpretation.
 *
 * The API exposes a raw `deadline` timestamp; how urgent that is depends on the
 * task status and on the current time, so the rule lives here instead of being
 * repeated in every view.
 */

import { CLOSED_STATUSES } from './domain.js';
import { DAY_MS, parseTimestamp } from './time.js';

/** A deadline within this window counts as "due soon". */
const DUE_SOON_MS = 2 * DAY_MS;

/**
 * Classify a deadline.
 *
 * @returns {{ state: 'none'|'closed'|'overdue'|'soon'|'upcoming', due: Date|null }}
 */
export function deadlineState(deadline, status, now = Date.now()) {
  const due = parseTimestamp(deadline);
  if (!due) return { state: 'none', due: null };
  if (CLOSED_STATUSES.has(status)) return { state: 'closed', due };

  const remaining = due.getTime() - now;
  if (remaining < 0) return { state: 'overdue', due };
  if (remaining <= DUE_SOON_MS) return { state: 'soon', due };
  return { state: 'upcoming', due };
}

export const isOverdue = (task, now) => deadlineState(task?.deadline, task?.status, now).state === 'overdue';

export const isDueSoon = (task, now) => deadlineState(task?.deadline, task?.status, now).state === 'soon';

/**
 * Tasks that need attention first: overdue before due-soon, then by deadline.
 * Tasks without a deadline, or already closed, are dropped.
 */
export function atRiskTasks(tasks = [], now = Date.now()) {
  const ranked = { overdue: 0, soon: 1 };
  return tasks
    .map((task) => ({ task, ...deadlineState(task.deadline, task.status, now) }))
    .filter((entry) => entry.state === 'overdue' || entry.state === 'soon')
    .sort((a, b) => ranked[a.state] - ranked[b.state] || a.due - b.due)
    .map((entry) => entry.task);
}

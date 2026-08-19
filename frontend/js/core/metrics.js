/**
 * Dashboard aggregation.
 *
 * The API has no statistics endpoint, so the dashboard is assembled from the
 * `total` of several cheap filtered task queries plus one window of open work.
 * Turning those raw numbers into the figures the dashboard shows happens here.
 */

import { isDueSoon, isOverdue } from './deadline.js';
import { TASK_PRIORITIES, TASK_STATUSES } from './domain.js';

const sumOf = (counts, keys) => keys.reduce((total, key) => total + (counts?.[key] ?? 0), 0);

/**
 * Share of each key in the total, as `{ key, count, share }` with `share`
 * between 0 and 1. Returned in the given order so colours stay stable.
 */
export function distribution(counts, keys) {
  const total = sumOf(counts, keys);
  return keys.map((key) => {
    const count = counts?.[key] ?? 0;
    return { key, count, share: total === 0 ? 0 : count / total };
  });
}

/**
 * Build the dashboard model.
 *
 * @param {object} input
 * @param {Record<string, number>} input.statusCounts Total per task status.
 * @param {Record<string, number>} input.priorityCounts Total per task priority.
 * @param {Array} input.openTasks Window of open tasks ordered by deadline.
 * @param {boolean} input.openTasksTruncated True when more open tasks exist
 *   than the window holds, so deadline figures are a lower bound.
 */
export function buildTaskSummary({
  statusCounts = {},
  priorityCounts = {},
  openTasks = [],
  openTasksTruncated = false,
  now = Date.now(),
} = {}) {
  const total = sumOf(statusCounts, TASK_STATUSES);
  const done = statusCounts.DONE ?? 0;
  const cancelled = statusCounts.CANCELLED ?? 0;
  const active = sumOf(statusCounts, ['TODO', 'IN_PROGRESS']);
  const finishable = total - cancelled;

  return {
    total,
    done,
    cancelled,
    active,
    todo: statusCounts.TODO ?? 0,
    inProgress: statusCounts.IN_PROGRESS ?? 0,
    overdue: openTasks.filter((task) => isOverdue(task, now)).length,
    dueSoon: openTasks.filter((task) => isDueSoon(task, now)).length,
    // A saturated window means the deadline counts above are a lower bound.
    deadlineCountsPartial: openTasksTruncated,
    completionRate: finishable > 0 ? done / finishable : 0,
    statusDistribution: distribution(statusCounts, TASK_STATUSES),
    priorityDistribution: distribution(priorityCounts, TASK_PRIORITIES),
  };
}

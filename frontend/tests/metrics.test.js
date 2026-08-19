/**
 * Dashboard aggregation over the count queries the client issues.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTaskSummary, distribution } from '../js/core/metrics.js';
import { DAY_MS } from '../js/core/time.js';

const NOW = Date.parse('2026-03-10T12:00:00Z');
const at = (offset) => new Date(NOW + offset).toISOString();

const statusCounts = { TODO: 6, IN_PROGRESS: 4, DONE: 8, CANCELLED: 2 };
const priorityCounts = { LOW: 2, MEDIUM: 10, HIGH: 6, CRITICAL: 2 };

describe('distribution', () => {
  it('expresses each value as a share of the total', () => {
    const result = distribution({ A: 1, B: 3 }, ['A', 'B']);
    assert.deepEqual(result, [
      { key: 'A', count: 1, share: 0.25 },
      { key: 'B', count: 3, share: 0.75 },
    ]);
  });

  it('reports a zero share instead of dividing by zero', () => {
    assert.deepEqual(distribution({}, ['A']), [{ key: 'A', count: 0, share: 0 }]);
  });
});

describe('buildTaskSummary', () => {
  const summary = buildTaskSummary({
    statusCounts,
    priorityCounts,
    openTasks: [
      { deadline: at(-DAY_MS), status: 'TODO' },
      { deadline: at(-2 * DAY_MS), status: 'IN_PROGRESS' },
      { deadline: at(DAY_MS), status: 'TODO' },
      { deadline: at(9 * DAY_MS), status: 'TODO' },
      { deadline: null, status: 'TODO' },
    ],
    now: NOW,
  });

  it('totals every status', () => {
    assert.equal(summary.total, 20);
    assert.equal(summary.active, 10);
    assert.equal(summary.done, 8);
    assert.equal(summary.cancelled, 2);
  });

  it('counts deadline pressure from the open window', () => {
    assert.equal(summary.overdue, 2);
    assert.equal(summary.dueSoon, 1);
  });

  it('excludes cancelled work from the completion rate', () => {
    // 8 done out of 18 tasks that can still be finished.
    assert.equal(summary.completionRate.toFixed(4), (8 / 18).toFixed(4));
  });

  it('builds distributions in a stable order', () => {
    assert.deepEqual(summary.statusDistribution.map((entry) => entry.key), [
      'TODO',
      'IN_PROGRESS',
      'DONE',
      'CANCELLED',
    ]);
    assert.equal(summary.priorityDistribution.find((entry) => entry.key === 'MEDIUM').count, 10);
  });

  it('handles an empty installation without dividing by zero', () => {
    const empty = buildTaskSummary({});
    assert.equal(empty.total, 0);
    assert.equal(empty.completionRate, 0);
    assert.equal(empty.overdue, 0);
  });

  it('flags deadline counts as partial when the open window was truncated', () => {
    const partial = buildTaskSummary({ statusCounts, openTasks: [], openTasksTruncated: true });
    assert.equal(partial.deadlineCountsPartial, true);
  });
});

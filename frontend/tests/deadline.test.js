/**
 * Deadline urgency, which drives the overdue styling and the dashboard's
 * "needs attention" list.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { atRiskTasks, deadlineState, isDueSoon, isOverdue } from '../js/core/deadline.js';
import { DAY_MS, HOUR_MS } from '../js/core/time.js';

const NOW = Date.parse('2026-03-10T12:00:00Z');
const at = (offset) => new Date(NOW + offset).toISOString();

describe('deadlineState', () => {
  it('reports no deadline when the task has none', () => {
    assert.equal(deadlineState(null, 'TODO', NOW).state, 'none');
  });

  it('marks a passed deadline as overdue', () => {
    assert.equal(deadlineState(at(-HOUR_MS), 'IN_PROGRESS', NOW).state, 'overdue');
  });

  it('marks a deadline within two days as due soon', () => {
    assert.equal(deadlineState(at(6 * HOUR_MS), 'TODO', NOW).state, 'soon');
    assert.equal(deadlineState(at(2 * DAY_MS - HOUR_MS), 'TODO', NOW).state, 'soon');
  });

  it('leaves a distant deadline alone', () => {
    assert.equal(deadlineState(at(5 * DAY_MS), 'TODO', NOW).state, 'upcoming');
  });

  it('never marks finished or cancelled work as late', () => {
    assert.equal(deadlineState(at(-5 * DAY_MS), 'DONE', NOW).state, 'closed');
    assert.equal(deadlineState(at(-5 * DAY_MS), 'CANCELLED', NOW).state, 'closed');
    assert.equal(isOverdue({ deadline: at(-5 * DAY_MS), status: 'DONE' }, NOW), false);
  });

  it('reads a timestamp without a timezone designator as UTC', () => {
    const withoutOffset = deadlineState('2026-03-10T11:00:00', 'TODO', NOW);
    assert.equal(withoutOffset.state, 'overdue');
    assert.equal(withoutOffset.due.toISOString(), '2026-03-10T11:00:00.000Z');
  });
});

describe('isOverdue and isDueSoon', () => {
  it('are mutually exclusive', () => {
    const task = { deadline: at(-HOUR_MS), status: 'TODO' };
    assert.equal(isOverdue(task, NOW), true);
    assert.equal(isDueSoon(task, NOW), false);
  });
});

describe('atRiskTasks', () => {
  it('keeps only overdue and imminent work, most urgent first', () => {
    const tasks = [
      { id: 1, deadline: at(3 * DAY_MS), status: 'TODO' },
      { id: 2, deadline: at(HOUR_MS), status: 'TODO' },
      { id: 3, deadline: at(-2 * DAY_MS), status: 'IN_PROGRESS' },
      { id: 4, deadline: null, status: 'TODO' },
      { id: 5, deadline: at(-10 * DAY_MS), status: 'DONE' },
      { id: 6, deadline: at(-HOUR_MS), status: 'TODO' },
    ];

    assert.deepEqual(atRiskTasks(tasks, NOW).map((task) => task.id), [3, 6, 2]);
  });

  it('returns nothing for an empty list', () => {
    assert.deepEqual(atRiskTasks([], NOW), []);
  });
});

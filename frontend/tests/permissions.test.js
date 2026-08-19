/**
 * The role rules the interface uses to decide which controls to show.
 * They must stay aligned with `src/services/task.py` and `src/services/user.py`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canChangeTaskStatus,
  canCreateTask,
  canDeleteTask,
  canEditTask,
  canManageUsers,
  canManageWork,
  canViewDirectory,
} from '../js/core/permissions.js';

const admin = { id: 1, role: 'ADMIN' };
const manager = { id: 2, role: 'MANAGER' };
const otherManager = { id: 3, role: 'MANAGER' };
const employee = { id: 4, role: 'EMPLOYEE' };

const task = (overrides = {}) => ({ id: 10, owner_id: manager.id, executor_id: employee.id, ...overrides });

describe('work management', () => {
  it('allows administrators and managers to create and edit tasks', () => {
    for (const user of [admin, manager]) {
      assert.equal(canManageWork(user), true);
      assert.equal(canCreateTask(user), true);
      assert.equal(canEditTask(user), true);
      assert.equal(canViewDirectory(user), true);
    }
  });

  it('does not let employees create or edit tasks', () => {
    assert.equal(canCreateTask(employee), false);
    assert.equal(canEditTask(employee), false);
    assert.equal(canViewDirectory(employee), false);
  });

  it('treats a missing profile as having no permissions', () => {
    assert.equal(canManageWork(null), false);
    assert.equal(canCreateTask(undefined), false);
    assert.equal(canDeleteTask(null, task()), false);
  });
});

describe('task deletion', () => {
  it('lets administrators delete any task', () => {
    assert.equal(canDeleteTask(admin, task({ owner_id: manager.id })), true);
  });

  it('lets a manager delete only the tasks they created', () => {
    assert.equal(canDeleteTask(manager, task({ owner_id: manager.id })), true);
    assert.equal(canDeleteTask(otherManager, task({ owner_id: manager.id })), false);
  });

  it('never lets an employee delete a task, not even their own', () => {
    assert.equal(canDeleteTask(employee, task({ executor_id: employee.id })), false);
  });
});

describe('status changes', () => {
  it('lets an employee change the status of a task assigned to them', () => {
    assert.equal(canChangeTaskStatus(employee, task({ executor_id: employee.id })), true);
  });

  it('does not let an employee touch someone else’s task', () => {
    assert.equal(canChangeTaskStatus(employee, task({ executor_id: 99 })), false);
    assert.equal(canChangeTaskStatus(employee, task({ executor_id: null })), false);
  });

  it('lets managers and administrators change any status', () => {
    assert.equal(canChangeTaskStatus(manager, task({ executor_id: 99 })), true);
    assert.equal(canChangeTaskStatus(admin, task({ executor_id: null })), true);
  });
});

describe('user administration', () => {
  it('is limited to administrators', () => {
    assert.equal(canManageUsers(admin), true);
    assert.equal(canManageUsers(manager), false);
    assert.equal(canManageUsers(employee), false);
  });
});

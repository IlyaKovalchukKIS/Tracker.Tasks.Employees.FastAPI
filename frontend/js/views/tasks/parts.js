/**
 * Task presentation shared by the dashboard, the task list, and the detail page.
 */

import { tasks as tasksApi } from '../../core/api.js';
import { TASK_STATUSES } from '../../core/domain.js';
import { t, taskStatusLabel } from '../../core/i18n.js';
import { canChangeTaskStatus } from '../../core/permissions.js';
import { getUser } from '../../core/session.js';
import { el } from '../../ui/dom.js';
import { confirmDialog, toast } from '../../ui/feedback.js';
import { select } from '../../ui/forms.js';
import { icon } from '../../ui/icons.js';
import { deadlineMeta, monospace, personLink, priorityBadge, statusBadge } from '../../ui/primitives.js';

/** Inline status dropdown, the fastest way to move work forward. */
export function statusControl(task, onChanged, { size } = {}) {
  const control = select({
    options: TASK_STATUSES.map((value) => ({ value, label: taskStatusLabel(value) })),
    value: task.status,
    class: `select${size ? ` select--${size}` : ''}`,
    'aria-label': t('task.statusChangeLabel', { title: task.title }),
  });

  control.addEventListener('change', async () => {
    const next = control.value;
    control.disabled = true;
    try {
      const updated = await tasksApi.update(task.id, { status: next });
      toast(t('task.statusUpdated', { status: taskStatusLabel(updated.status) }), 'success');
      onChanged?.(updated);
    } catch (error) {
      control.value = task.status;
      toast(error.message, 'error');
    } finally {
      control.disabled = false;
    }
  });

  return control;
}

/** Status as an editable control when allowed, and as a badge otherwise. */
export const statusCell = (task, onChanged) =>
  canChangeTaskStatus(getUser(), task) ? statusControl(task, onChanged, { size: 'sm' }) : statusBadge(task.status);

/** Ask before deleting; resolves to `true` once the task is gone. */
export async function confirmDeleteTask(task) {
  const confirmed = await confirmDialog({
    title: t('task.delete.title'),
    message: t('task.delete.message', { title: task.title }),
    confirmLabel: t('action.delete'),
    danger: true,
  });
  if (!confirmed) return false;
  await tasksApi.remove(task.id);
  toast(t('task.deleted'), 'success');
  return true;
}

export const assigneeMeta = (task) =>
  el('span', { class: 'meta' }, icon('user'), personLink(task.executor_id));

/**
 * Compact single-line task summary, used inside dashboard cards and the
 * employee profile.
 */
export function taskLine(task, { showAssignee = true } = {}) {
  return el(
    'li',
    { class: 'task-line' },
    el(
      'div',
      { class: 'task-line__main' },
      el('a', { class: 'task-line__title', href: `#/tasks/${task.id}`, text: task.title }),
      el(
        'div',
        { class: 'task-line__meta' },
        deadlineMeta(task.deadline, task.status, { compact: true }),
        showAssignee ? assigneeMeta(task) : null,
      ),
    ),
    el('div', { class: 'task-line__side' }, priorityBadge(task.priority), statusBadge(task.status)),
  );
}

export const taskLines = (tasks, options) =>
  el('ul', { class: 'task-lines' }, ...tasks.map((task) => taskLine(task, options)));

/**
 * Full task card used on narrow layouts, where a table would force horizontal
 * scrolling. Carries the same actions as a table row.
 */
export function taskCard(task, { actions, onStatusChanged, showAssignee = true }) {
  return el(
    'article',
    { class: 'task-card' },
    el(
      'div',
      { class: 'task-card__head' },
      el(
        'div',
        { class: 'task-card__titles' },
        monospace(`#${task.id}`),
        el('a', { class: 'task-card__title', href: `#/tasks/${task.id}`, text: task.title }),
      ),
      priorityBadge(task.priority),
    ),
    el('p', { class: 'task-card__excerpt', text: task.description }),
    el(
      'div',
      { class: 'task-card__meta' },
      deadlineMeta(task.deadline, task.status, { compact: true }),
      showAssignee ? assigneeMeta(task) : null,
    ),
    el(
      'div',
      { class: 'task-card__footer' },
      statusCell(task, onStatusChanged),
      actions ? el('div', { class: 'row-actions' }, actions) : null,
    ),
  );
}

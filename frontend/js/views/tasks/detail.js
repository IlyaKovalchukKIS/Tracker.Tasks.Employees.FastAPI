/**
 * Task detail: everything known about one task, with the actions the current
 * role is allowed to perform.
 */

import { tasks as tasksApi } from '../../core/api.js';
import { labelFor, resolveUsers } from '../../core/directory.js';
import { formatDate, formatRelative, t } from '../../core/i18n.js';
import { canChangeTaskStatus, canDeleteTask, canEditTask, canViewDirectory } from '../../core/permissions.js';
import { getUser } from '../../core/session.js';
import { setBreadcrumb } from '../../layout/shell.js';
import { el, renderInto } from '../../ui/dom.js';
import { menu, toast } from '../../ui/feedback.js';
import {
  badge,
  button,
  card,
  detailList,
  deadlineMeta,
  monospace,
  pageHeader,
  personLink,
  priorityBadge,
  statusBadge,
} from '../../ui/primitives.js';
import { errorState } from '../../ui/states.js';
import { openTaskForm } from './form.js';
import { confirmDeleteTask, statusControl } from './parts.js';

/** Timestamp shown as "3 days ago" with the exact value available on hover. */
const timestamp = (value) =>
  el('span', { class: 'timestamp', title: formatDate(value, { withTime: true }) }, formatRelative(value));

export async function renderTaskDetail({ params, navigate }) {
  const user = getUser();
  let task;

  try {
    task = await tasksApi.get(params.id);
  } catch (error) {
    setBreadcrumb([{ label: t('tasks.title'), href: '#/tasks' }]);
    return errorState({
      error,
      action: button(t('action.backToTasks'), { iconName: 'arrowLeft', onClick: () => navigate('#/tasks') }),
    });
  }

  // Employees may not read other users, so resolving the creator would only
  // produce a request the API refuses; the id is shown instead.
  await resolveUsers(canViewDirectory(user) ? [task.executor_id, task.owner_id] : [task.executor_id]);

  const host = el('div', { class: 'detail-page' });
  let parentTask = null;
  if (task.parent_id) {
    try {
      parentTask = await tasksApi.get(task.parent_id);
    } catch {
      /* parent is missing or not visible to this role */
    }
  }

  async function paint(current) {
    setBreadcrumb([{ label: t('tasks.title'), href: '#/tasks' }, { label: `#${current.id}` }]);

    if (current.parent_id && current.parent_id !== parentTask?.id) {
      try {
        parentTask = await tasksApi.get(current.parent_id);
      } catch {
        parentTask = null;
      }
    }
    if (!current.parent_id) parentTask = null;

    async function onDelete() {
      try {
        if (await confirmDeleteTask(current)) navigate('#/tasks');
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    const actions = el(
      'div',
      { class: 'page-header__actions' },
      canChangeTaskStatus(user, current) ? statusControl(current, paint) : null,
      canEditTask(user)
        ? button(t('action.edit'), {
            iconName: 'pencil',
            onClick: () => openTaskForm({ task: current, onSaved: paint }),
          })
        : null,
      // Deleting sits one step away so it cannot be hit while reaching for edit,
      // which matters most on a phone where the buttons span the full width.
      canDeleteTask(user, current)
        ? menu({
            trigger: button('', { iconName: 'more', 'aria-label': t('task.moreActions') }),
            placement: 'below',
            label: t('task.moreActions'),
            items: [{ label: t('action.delete'), iconName: 'trash', danger: true, onSelect: onDelete }],
          })
        : null,
    );

    renderInto(
      host,
      el(
        'a',
        { class: 'back-link', href: '#/tasks' },
        el('span', { text: `← ${t('action.backToTasks')}` }),
      ),
      pageHeader({ title: current.title, actions }),
      el(
        'div',
        { class: 'detail-badges' },
        monospace(`#${current.id}`),
        statusBadge(current.status),
        priorityBadge(current.priority),
        deadlineMeta(current.deadline, current.status, { relative: true }),
      ),
      el(
        'div',
        { class: 'detail-columns' },
        el(
          'div',
          { class: 'detail-columns__main' },
          card(
            { title: t('task.field.description') },
            el('p', { class: 'prose', text: current.description }),
          ),
        ),
        el(
          'div',
          { class: 'detail-columns__side' },
          card(
            { title: t('task.detail.properties') },
            detailList([
              {
                label: t('task.field.assignee'),
                value: current.executor_id
                  ? personLink(current.executor_id)
                  : badge(t('task.unassigned'), 'muted', { dot: false }),
              },
              {
                label: t('task.field.owner'),
                value: canViewDirectory(user) ? personLink(current.owner_id) : labelFor(current.owner_id) ?? '—',
              },
              { label: t('task.field.deadline'), value: deadlineMeta(current.deadline, current.status) },
              {
                label: t('task.field.parent'),
                value: current.parent_id
                  ? el('a', {
                      href: `#/tasks/${current.parent_id}`,
                      text: parentTask?.title ?? `#${current.parent_id}`,
                    })
                  : el('span', { class: 'cell-muted--soft', text: t('task.noParent') }),
              },
            ]),
          ),
          card(
            { title: t('task.detail.activity') },
            detailList([
              { label: t('task.field.created'), value: timestamp(current.created_at) },
              { label: t('task.field.updated'), value: timestamp(current.updated_at) },
            ]),
          ),
        ),
      ),
    );
  }

  await paint(task);
  return host;
}

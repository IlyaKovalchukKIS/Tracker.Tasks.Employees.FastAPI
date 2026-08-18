/**
 * Employee directory and employee detail with assigned tasks.
 */

import { employees as employeesApi } from '../api.js';
import { labelFor, primeUsers, resolveUsers } from '../directory.js';
import { formatNumber, t } from '../i18n.js';
import {
  activeBadge,
  avatar,
  button,
  deadlineMeta,
  el,
  emptyState,
  priorityBadge,
  roleBadge,
  statusBadge,
} from '../ui.js';

function employeeRow(person) {
  return el(
    'tr',
    {},
    el(
      'td',
      { class: 'table__cell-strong' },
      el(
        'a',
        { class: 'row', href: `#/employees/${person.id}`, 'aria-label': t('employee.viewProfile', { email: person.email }) },
        avatar(person.email),
        el('span', { text: person.email }),
      ),
    ),
    el('td', {}, roleBadge(person.role)),
    el('td', { text: labelFor(person.manager_id) ?? t('employee.noManager') }),
    el('td', {}, activeBadge(person.is_active)),
  );
}

export async function renderEmployeeList() {
  const people = await employeesApi.list();
  primeUsers(people);
  await resolveUsers(people.map((person) => person.manager_id));

  const header = el(
    'div',
    { class: 'page-header' },
    el(
      'div',
      { class: 'page-header__text' },
      el('h1', { text: t('employees.title') }),
      el('p', { class: 'page-header__subtitle', text: t('employees.subtitle') }),
    ),
    people.length > 0
      ? el('p', { class: 'page-header__subtitle', text: t('employees.count', { count: formatNumber(people.length) }) })
      : null,
  );

  if (people.length === 0) {
    return el(
      'div',
      {},
      header,
      emptyState({
        iconName: 'users',
        title: t('employees.empty.title'),
        description: t('employees.empty.description'),
      }),
    );
  }

  return el(
    'div',
    {},
    header,
    el(
      'div',
      { class: 'table-wrap' },
      el(
        'table',
        { class: 'table' },
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            el('th', { scope: 'col', text: t('employee.field.email') }),
            el('th', { scope: 'col', text: t('employee.field.role') }),
            el('th', { scope: 'col', text: t('employee.field.manager') }),
            el('th', { scope: 'col', text: t('employee.field.status') }),
          ),
        ),
        el('tbody', {}, ...people.map(employeeRow)),
      ),
    ),
  );
}

function assignedTask(task) {
  return el(
    'article',
    { class: 'item' },
    el(
      'div',
      { class: 'item__main' },
      el('a', { class: 'item__title', href: `#/tasks/${task.id}`, text: task.title }),
      el(
        'div',
        { class: 'item__meta' },
        el('span', { class: 'mono', text: `#${task.id}` }),
        statusBadge(task.status),
        priorityBadge(task.priority),
        deadlineMeta(task.deadline, task.status),
      ),
    ),
  );
}

export async function renderEmployeeDetail({ params, navigate }) {
  let person;
  try {
    person = await employeesApi.get(params.id);
  } catch (error) {
    return emptyState({
      iconName: error.status === 404 ? 'search' : 'alert',
      title: t('error.title'),
      description: error.status === 404 ? t('error.employeeMissing') : error.message,
      action: button(t('action.backToEmployees'), {
        iconName: 'arrowLeft',
        onClick: () => navigate('#/employees'),
      }),
    });
  }

  await resolveUsers([person.manager_id]);
  const assigned = person.executed_tasks ?? [];

  return el(
    'div',
    {},
    el('p', { class: 'breadcrumb' }, el('a', { href: '#/employees', text: t('action.backToEmployees') })),
    el(
      'div',
      { class: 'page-header' },
      el(
        'div',
        { class: 'page-header__text' },
        el('p', { class: 'page-header__subtitle', text: t('employee.detail.title') }),
        el('div', { class: 'row' }, avatar(person.email), el('h1', { text: person.email })),
      ),
      el('div', { class: 'page-actions' }, roleBadge(person.role), activeBadge(person.is_active)),
    ),
    el(
      'div',
      { class: 'stack' },
      el(
        'section',
        { class: 'card' },
        el('div', { class: 'card__body' },
          el(
            'dl',
            { class: 'detail-list' },
            el('dt', { text: t('profile.field.id') }),
            el('dd', { class: 'mono', text: `#${person.id}` }),
            el('dt', { text: t('employee.field.role') }),
            el('dd', {}, roleBadge(person.role)),
            el('dt', { text: t('employee.field.manager') }),
            el('dd', { text: labelFor(person.manager_id) ?? t('employee.noManager') }),
            el('dt', { text: t('employee.field.status') }),
            el('dd', {}, activeBadge(person.is_active)),
          ),
        ),
      ),
      el(
        'section',
        { class: 'card' },
        el(
          'div',
          { class: 'card__header' },
          el('h2', { text: t('employee.assignedTasks') }),
          el('span', { class: 'meta', text: formatNumber(assigned.length) }),
        ),
        el(
          'div',
          { class: 'card__body' },
          assigned.length === 0
            ? el('p', { class: 'state__description', text: t('employee.tasksEmpty') })
            : el('div', { class: 'item-list' }, ...assigned.map(assignedTask)),
        ),
      ),
    ),
  );
}

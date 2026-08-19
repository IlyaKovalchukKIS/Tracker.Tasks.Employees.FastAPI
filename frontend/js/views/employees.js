/**
 * Employee directory and the profile of a single employee with their workload.
 */

import { employees as employeesApi } from '../core/api.js';
import { labelFor, primeUsers, resolveUsers } from '../core/directory.js';
import { formatNumber, t } from '../core/i18n.js';
import { isEmployee } from '../core/permissions.js';
import { setBreadcrumb } from '../layout/shell.js';
import { debounce, el } from '../ui/dom.js';
import { searchField } from '../ui/forms.js';
import { icon } from '../ui/icons.js';
import { activeBadge, avatar, button, card, detailList, pageHeader, personLink, roleBadge } from '../ui/primitives.js';
import { emptyState, errorState } from '../ui/states.js';
import { taskLines } from './tasks/parts.js';

function employeeCard(person) {
  return el(
    'a',
    { class: 'person-card', href: `#/employees/${person.id}` },
    el(
      'div',
      { class: 'person-card__head' },
      avatar(person.email, { size: 'lg' }),
      el(
        'div',
        { class: 'person-card__identity' },
        el('span', { class: 'person-card__email', text: person.email }),
        // Only employees report to a manager, so the line would always read
        // "not assigned" for anyone else.
        isEmployee(person)
          ? el('span', {
              class: 'person-card__manager',
              text: t('employee.managedBy', { manager: labelFor(person.manager_id) ?? t('employee.noManager') }),
            })
          : null,
      ),
    ),
    el('div', { class: 'person-card__badges' }, roleBadge(person.role), activeBadge(person.is_active)),
    el('span', { class: 'person-card__arrow' }, icon('arrowRight')),
  );
}

export async function renderEmployeeList() {
  const people = await employeesApi.list();
  primeUsers(people);
  await resolveUsers(people.map((person) => person.manager_id));

  const header = pageHeader({
    title: t('employees.title'),
    description: t('employees.subtitle'),
    actions:
      people.length > 0
        ? el('span', { class: 'count-pill', text: t('employees.count', { count: formatNumber(people.length) }) })
        : null,
  });

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

  const grid = el('div', { class: 'person-grid' }, ...people.map(employeeCard));

  const search = searchField({
    label: t('employees.filter.search'),
    placeholder: t('employees.filter.placeholder'),
  });

  const paint = () => {
    const query = search.control.value.trim().toLowerCase();
    const visible = query ? people.filter((person) => person.email.toLowerCase().includes(query)) : people;
    if (visible.length === 0) {
      grid.replaceChildren(
        emptyState({
          iconName: 'search',
          title: t('employees.filter.empty'),
          description: t('employees.filter.emptyDescription'),
          compact: true,
        }),
      );
      return;
    }
    grid.replaceChildren(...visible.map(employeeCard));
  };

  search.control.addEventListener('input', debounce(paint, 200));

  return el(
    'div',
    {},
    header,
    people.length > 6
      ? el('div', { class: 'toolbar', role: 'search', 'aria-label': t('employees.filter.search') }, el('div', { class: 'toolbar__search' }, search.node))
      : null,
    grid,
  );
}

export async function renderEmployeeDetail({ params, navigate }) {
  let person;

  try {
    person = await employeesApi.get(params.id);
  } catch (error) {
    setBreadcrumb([{ label: t('employees.title'), href: '#/employees' }]);
    return errorState({
      error,
      action: button(t('action.backToEmployees'), {
        iconName: 'arrowLeft',
        onClick: () => navigate('#/employees'),
      }),
    });
  }

  await resolveUsers([person.manager_id]);
  setBreadcrumb([{ label: t('employees.title'), href: '#/employees' }, { label: person.email }]);

  const assigned = person.executed_tasks ?? [];

  return el(
    'div',
    { class: 'detail-page' },
    el('a', { class: 'back-link', href: '#/employees' }, el('span', { text: `← ${t('action.backToEmployees')}` })),
    el(
      'div',
      { class: 'page-header' },
      el(
        'div',
        { class: 'page-header__text page-header__text--inline' },
        avatar(person.email, { size: 'lg' }),
        el(
          'div',
          {},
          el('h1', { text: person.email }),
          el('p', { class: 'page-header__description', text: t('employee.detail.title') }),
        ),
      ),
      el('div', { class: 'page-header__actions' }, roleBadge(person.role), activeBadge(person.is_active)),
    ),
    el(
      'div',
      { class: 'detail-columns detail-columns--reverse' },
      el(
        'div',
        { class: 'detail-columns__main' },
        card(
          {
            title: t('employee.assignedTasks'),
            description: t('employee.assignedTasks.description'),
            actions: el('span', { class: 'count-pill', text: formatNumber(assigned.length) }),
          },
          assigned.length === 0
            ? emptyState({
                iconName: 'inbox',
                title: t('employee.tasksEmpty.title'),
                description: t('employee.tasksEmpty.description'),
                compact: true,
              })
            : taskLines(assigned, { showAssignee: false }),
        ),
      ),
      el(
        'div',
        { class: 'detail-columns__side' },
        card(
          { title: t('employee.detail.account') },
          detailList([
            { label: t('profile.field.id'), value: el('span', { class: 'mono', text: `#${person.id}` }) },
            { label: t('employee.field.role'), value: roleBadge(person.role) },
            ...(isEmployee(person)
              ? [
                  {
                    label: t('employee.field.manager'),
                    value: person.manager_id ? personLink(person.manager_id) : t('employee.noManager'),
                  },
                ]
              : []),
            { label: t('employee.field.status'), value: activeBadge(person.is_active) },
          ]),
        ),
      ),
    ),
  );
}

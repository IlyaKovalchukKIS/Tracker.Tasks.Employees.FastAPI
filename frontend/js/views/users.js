/**
 * Administrator view: roles, manager assignment, and account state.
 */

import { users as usersApi } from '../core/api.js';
import { invalidateDirectory, primeUsers } from '../core/directory.js';
import { ROLES } from '../core/domain.js';
import { formatDate, roleLabel, t } from '../core/i18n.js';
import { getUser, setUser } from '../core/session.js';
import { el, fragment, renderInto, watchMediaFor, debounce } from '../ui/dom.js';
import { confirmDialog, openModal, toast } from '../ui/feedback.js';
import { checkbox, field, formError, searchField, select, setFieldErrors } from '../ui/forms.js';
import {
  activeBadge,
  avatar,
  badge,
  button,
  detailList,
  pageHeader,
  personChip,
  roleBadge,
  setButtonLoading,
} from '../ui/primitives.js';
import { emptyState } from '../ui/states.js';
import { actionsColumn, dataTable, rowActions } from '../ui/table.js';

// The user table drops to four columns on smaller screens, so it stays
// readable further down than the task table does.
const TABLE_QUERY = '(min-width: 900px)';

/**
 * Edit dialog for role, manager, and account state.
 *
 * The API only accepts a manager that holds the MANAGER role and clears the
 * manager whenever the user is not an employee, so the form enforces the same.
 */
function openUserForm({ user, allUsers, onSaved }) {
  const isSelf = user.id === getUser()?.id;

  const roleSelect = select({
    options: ROLES.map((value) => ({ value, label: roleLabel(value) })),
    value: user.role,
    onChange: () => syncManagerField(),
  });

  const managerCandidates = allUsers.filter(
    (candidate) => candidate.role === 'MANAGER' && candidate.id !== user.id,
  );

  const managerSelect = select({
    options: [
      { value: '', label: t('users.field.managerNone') },
      ...managerCandidates.map((candidate) => ({ value: candidate.id, label: candidate.email })),
    ],
    value: user.manager_id ?? '',
  });

  const activeToggle = checkbox({ label: t('users.field.active'), checked: user.is_active, disabled: isSelf });
  const activeInput = activeToggle.querySelector('input');

  const managerField = field({
    name: 'manager_id',
    label: t('users.field.manager'),
    control: managerSelect,
    hint: ' ',
  });
  const managerHint = managerField.querySelector('.field__hint');

  function syncManagerField() {
    const employeeSelected = roleSelect.value === 'EMPLOYEE';
    managerSelect.disabled = !employeeSelected || managerCandidates.length === 0;
    if (!employeeSelected) managerSelect.value = '';
    managerHint.textContent = employeeSelected
      ? managerCandidates.length === 0
        ? t('users.field.managerEmpty')
        : t('users.field.managerPick')
      : t('users.field.managerHint');
  }

  const banner = formError();

  const form = el(
    'form',
    { class: 'form', id: 'user-form', novalidate: true, onSubmit },
    banner,
    field({ name: 'role', label: t('users.field.role'), control: roleSelect, hint: t('users.field.roleHint') }),
    managerField,
    el(
      'div',
      { class: 'field', dataset: { field: 'is_active' } },
      activeToggle,
      el('p', {
        class: 'field__hint',
        text: isSelf ? t('users.field.activeSelfHint') : t('users.field.activeHint'),
      }),
    ),
  );

  syncManagerField();

  const submit = button(t('action.saveChanges'), { variant: 'primary', type: 'submit', form: 'user-form' });

  const modal = openModal({
    title: t('users.edit.title'),
    description: user.email,
    body: form,
    footer: fragment(button(t('action.cancel'), { onClick: () => modal.close() }), submit),
  });

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);
    setButtonLoading(submit, true);
    try {
      const saved = await usersApi.update(user.id, {
        role: roleSelect.value,
        manager_id: managerSelect.value ? Number(managerSelect.value) : null,
        is_active: activeInput.checked,
      });
      invalidateDirectory();
      modal.close();
      toast(t('users.updated', { email: saved.email }), 'success');
      if (saved.id === getUser()?.id) setUser(saved);
      onSaved?.(saved);
    } catch (error) {
      banner.setMessage(error.message);
      setFieldErrors(form, error.fieldErrors ?? {});
    } finally {
      setButtonLoading(submit, false);
    }
  }
}

export async function renderUsers({ reload }) {
  const allUsers = await usersApi.list();
  primeUsers(allUsers);

  const currentId = getUser()?.id;
  const byId = new Map(allUsers.map((user) => [user.id, user]));
  const managerName = (user) => byId.get(user.manager_id)?.email ?? t('users.field.managerNone');

  async function onDelete(user) {
    const confirmed = await confirmDialog({
      title: t('users.delete.title'),
      message: t('users.delete.message', { email: user.email }),
      confirmLabel: t('action.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await usersApi.remove(user.id);
      invalidateDirectory();
      toast(t('users.deleted'), 'success');
      reload();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  const userActions = (user) =>
    rowActions(
      button('', {
        variant: 'ghost',
        size: 'sm',
        iconName: 'pencil',
        'aria-label': t('users.editLabel', { email: user.email }),
        title: t('action.edit'),
        onClick: () => openUserForm({ user, allUsers, onSaved: reload }),
      }),
      button('', {
        variant: 'ghost',
        size: 'sm',
        iconName: 'trash',
        class: 'btn--danger-ghost',
        disabled: user.id === currentId,
        title: user.id === currentId ? t('users.field.deleteSelfHint') : t('action.delete'),
        'aria-label': t('users.deleteLabel', { email: user.email }),
        onClick: () => onDelete(user),
      }),
    );

  const identityCell = (user) =>
    el(
      'div',
      { class: 'cell-person' },
      personChip(user.email),
      user.id === currentId ? badge(t('users.you'), 'accent', { dot: false }) : null,
    );

  const tableView = (rows) =>
    dataTable({
      caption: t('users.tableCaption'),
      rows,
      rowKey: (user) => user.id,
      columns: [
        { key: 'user', header: t('users.table.user'), cell: identityCell },
        { key: 'role', header: t('users.table.role'), cell: (user) => roleBadge(user.role) },
        {
          key: 'manager',
          header: t('users.table.manager'),
          hideBelow: 'lg',
          cell: (user) => el('span', { class: 'cell-muted cell-email', text: managerName(user) }),
        },
        { key: 'status', header: t('users.table.status'), cell: (user) => activeBadge(user.is_active) },
        {
          key: 'created',
          header: t('users.table.created'),
          hideBelow: 'xl',
          cell: (user) => el('span', { class: 'cell-muted', text: formatDate(user.created_at) }),
        },
        actionsColumn(userActions),
      ],
    });

  const cardsView = (rows) =>
    el(
      'div',
      { class: 'card-list' },
      ...rows.map((user) =>
        el(
          'article',
          { class: 'record-card' },
          el(
            'div',
            { class: 'record-card__head' },
            el('div', { class: 'cell-person' }, avatar(user.email), el('span', { class: 'record-card__title', text: user.email })),
            user.id === currentId ? badge(t('users.you'), 'accent', { dot: false }) : null,
          ),
          detailList([
            { label: t('users.table.role'), value: roleBadge(user.role) },
            { label: t('users.table.manager'), value: managerName(user) },
            { label: t('users.table.status'), value: activeBadge(user.is_active) },
            { label: t('users.table.created'), value: formatDate(user.created_at) },
          ]),
          el('div', { class: 'record-card__footer' }, userActions(user)),
        ),
      ),
    );

  const header = pageHeader({ title: t('users.title'), description: t('users.subtitle') });

  if (allUsers.length === 0) {
    return el(
      'div',
      {},
      header,
      emptyState({ iconName: 'users', title: t('users.empty.title'), description: t('users.empty.description') }),
    );
  }

  const search = searchField({
    label: t('users.filter.search'),
    placeholder: t('users.filter.placeholder'),
  });
  const host = el('div', {});
  const page = el(
    'div',
    {},
    header,
    allUsers.length > 6
      ? el('div', { class: 'toolbar', role: 'search', 'aria-label': t('users.filter.search') }, el('div', { class: 'toolbar__search' }, search.node))
      : null,
    host,
  );

  let wide = false;
  const visibleUsers = () => {
    const query = search.control.value.trim().toLowerCase();
    return query ? allUsers.filter((user) => user.email.toLowerCase().includes(query)) : allUsers;
  };

  const paint = () => {
    const rows = visibleUsers();
    if (rows.length === 0) {
      renderInto(
        host,
        emptyState({
          iconName: 'search',
          title: t('users.filter.empty'),
          description: t('users.filter.emptyDescription'),
          compact: true,
        }),
      );
      return;
    }
    renderInto(host, wide ? tableView(rows) : cardsView(rows));
  };

  search.control.addEventListener('input', debounce(paint, 200));

  watchMediaFor(page, TABLE_QUERY, (matches) => {
    wide = matches;
    paint();
  });

  return page;
}

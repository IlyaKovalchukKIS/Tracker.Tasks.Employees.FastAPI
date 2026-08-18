/**
 * Administrator view for roles, manager assignment, and account state.
 */

import { users as usersApi } from '../api.js';
import { invalidateDirectory, primeUsers } from '../directory.js';
import { formatDate, roleLabel, t } from '../i18n.js';
import { getUser, setUser } from '../session.js';
import {
  activeBadge,
  avatar,
  badge,
  button,
  checkbox,
  confirmDialog,
  el,
  emptyState,
  field,
  formError,
  fragment,
  openModal,
  roleBadge,
  select,
  setButtonLoading,
  setFieldErrors,
  toast,
} from '../ui.js';

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

/** Edit dialog for role, manager, and active state. */
function openUserForm({ user, allUsers, onSaved }) {
  const isSelf = user.id === getUser()?.id;

  const roleSelect = select({
    options: ROLES.map((value) => ({ value, label: roleLabel(value) })),
    value: user.role,
    onChange: () => syncManagerAvailability(),
  });

  // The API only accepts a manager that actually holds the MANAGER role, and it
  // clears the manager whenever the user is not an employee.
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

  const managerHint = el('p', { class: 'field__hint' });

  function syncManagerAvailability() {
    const employeeSelected = roleSelect.value === 'EMPLOYEE';
    const available = employeeSelected && managerCandidates.length > 0;
    managerSelect.disabled = !available;
    if (!employeeSelected) managerSelect.value = '';
    managerHint.textContent = employeeSelected
      ? managerCandidates.length === 0
        ? t('users.field.managerEmpty')
        : ''
      : t('users.field.managerHint');
  }

  const activeToggle = checkbox({
    label: t('users.field.active'),
    checked: user.is_active,
    disabled: isSelf,
  });
  const activeInput = activeToggle.querySelector('input');

  const banner = formError();
  const form = el(
    'form',
    { class: 'form', id: 'user-form', novalidate: true, onSubmit: onSubmit },
    banner,
    field({ name: 'role', label: t('users.field.role'), control: roleSelect }),
    el(
      'div',
      { class: 'field', dataset: { field: 'manager_id' } },
      el('label', { class: 'field__label', for: 'user-manager', text: t('users.field.manager') }),
      managerSelect,
      managerHint,
      el('p', { class: 'field__error', role: 'alert' }),
    ),
    el(
      'div',
      { class: 'field', dataset: { field: 'is_active' } },
      activeToggle,
      el('p', { class: 'field__hint', text: isSelf ? t('users.field.activeSelfHint') : t('users.field.activeHint') }),
    ),
  );

  managerSelect.id = 'user-manager';
  syncManagerAvailability();

  const submit = button(t('action.saveChanges'), { variant: 'primary', type: 'submit', form: 'user-form' });

  const modal = openModal({
    title: t('users.edit.title', { email: user.email }),
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
      toast(t('users.updated'), 'success');
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

  function userRow(user) {
    return el(
      'tr',
      {},
      el(
        'td',
        { class: 'table__cell-strong' },
        el(
          'span',
          { class: 'row' },
          avatar(user.email),
          el('span', { text: user.email }),
          user.id === currentId ? badge(t('users.you'), 'accent', { plain: true }) : null,
        ),
      ),
      el('td', {}, roleBadge(user.role)),
      el('td', { text: byId.get(user.manager_id)?.email ?? t('users.field.managerNone') }),
      el('td', {}, activeBadge(user.is_active)),
      el('td', { text: formatDate(user.created_at) }),
      el(
        'td',
        { class: 'table__actions' },
        el(
          'span',
          { class: 'row', style: { justifyContent: 'flex-end' } },
          button('', {
            variant: 'ghost',
            size: 'sm',
            iconName: 'pencil',
            'aria-label': `${t('action.edit')}: ${user.email}`,
            onClick: () => openUserForm({ user, allUsers, onSaved: reload }),
          }),
          button('', {
            variant: 'ghost',
            size: 'sm',
            iconName: 'trash',
            disabled: user.id === currentId,
            'aria-label': `${t('action.delete')}: ${user.email}`,
            onClick: () => onDelete(user),
          }),
        ),
      ),
    );
  }

  const header = el(
    'div',
    { class: 'page-header' },
    el(
      'div',
      { class: 'page-header__text' },
      el('h1', { text: t('users.title') }),
      el('p', { class: 'page-header__subtitle', text: t('users.subtitle') }),
    ),
  );

  const page = el('div', {}, header);

  if (allUsers.length === 0) {
    page.append(emptyState({ iconName: 'users', title: t('users.empty.title'), description: t('users.empty.description') }));
    return page;
  }

  page.append(
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
            el('th', { scope: 'col', text: t('users.table.user') }),
            el('th', { scope: 'col', text: t('users.table.role') }),
            el('th', { scope: 'col', text: t('users.table.manager') }),
            el('th', { scope: 'col', text: t('users.table.status') }),
            el('th', { scope: 'col', text: t('users.table.created') }),
            el('th', { scope: 'col', class: 'table__actions', text: t('users.table.actions') }),
          ),
        ),
        el('tbody', {}, ...allUsers.map(userRow)),
      ),
    ),
  );

  return page;
}

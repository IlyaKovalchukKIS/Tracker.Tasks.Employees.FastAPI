/**
 * Own account details, credential changes, and sign-out.
 */

import { users as usersApi } from '../api.js';
import { labelFor, primeUser, resolveUsers } from '../directory.js';
import { formatDate, t } from '../i18n.js';
import { getUser, setUser } from '../session.js';
import {
  activeBadge,
  avatar,
  button,
  el,
  field,
  formError,
  input,
  roleBadge,
  setButtonLoading,
  setFieldErrors,
  toast,
} from '../ui.js';
import { compact, validateEmail, validatePassword } from '../validate.js';

/** Card wrapper for the two credential forms. */
function formCard({ title, form }) {
  return el(
    'section',
    { class: 'card' },
    el('div', { class: 'card__header' }, el('h2', { text: title })),
    el('div', { class: 'card__body' }, form),
  );
}

function emailForm(profile, onUpdated) {
  const emailInput = input({ type: 'email', value: profile.email, autocomplete: 'email' });
  const banner = formError();
  const submit = button(t('action.save'), { variant: 'primary', type: 'submit' });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit: onSubmit },
    banner,
    field({ name: 'email', label: t('profile.field.newEmail'), control: emailInput, required: true }),
    el('div', {}, submit),
  );

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);
    const email = emailInput.value.trim();
    const errors = compact({ email: validateEmail(email) });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) return;
    if (email === profile.email) return;

    setButtonLoading(submit, true);
    try {
      const updated = await usersApi.updateMe({ email });
      setUser(updated);
      primeUser(updated);
      toast(t('profile.emailUpdated'), 'success');
      onUpdated();
    } catch (error) {
      banner.setMessage(error.message);
      setFieldErrors(form, error.fieldErrors ?? {});
    } finally {
      setButtonLoading(submit, false);
    }
  }

  return form;
}

function passwordForm() {
  const passwordInput = input({ type: 'password', autocomplete: 'new-password' });
  const confirmInput = input({ type: 'password', autocomplete: 'new-password' });
  const banner = formError();
  const submit = button(t('action.save'), { variant: 'primary', type: 'submit' });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit: onSubmit },
    banner,
    field({
      name: 'password',
      label: t('profile.field.newPassword'),
      control: passwordInput,
      hint: t('auth.password.hint'),
      required: true,
    }),
    field({ name: 'passwordConfirm', label: t('auth.field.passwordConfirm'), control: confirmInput, required: true }),
    el('div', {}, submit),
  );

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);
    const password = passwordInput.value;
    const errors = compact({
      password: validatePassword(password),
      passwordConfirm: password && confirmInput.value !== password ? t('validation.passwordMismatch') : null,
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) return;

    setButtonLoading(submit, true);
    try {
      const updated = await usersApi.updateMe({ password });
      setUser(updated);
      passwordInput.value = '';
      confirmInput.value = '';
      setFieldErrors(form, {});
      toast(t('profile.passwordUpdated'), 'success');
    } catch (error) {
      banner.setMessage(error.message);
      setFieldErrors(form, error.fieldErrors ?? {});
    } finally {
      setButtonLoading(submit, false);
    }
  }

  return form;
}

export async function renderProfile({ reload, logout }) {
  const profile = getUser() ?? setUser(await usersApi.me());
  await resolveUsers([profile.manager_id]);

  return el(
    'div',
    {},
    el(
      'div',
      { class: 'page-header' },
      el(
        'div',
        { class: 'page-header__text' },
        el('h1', { text: t('profile.title') }),
        el('p', { class: 'page-header__subtitle', text: t('profile.subtitle') }),
      ),
    ),
    el(
      'div',
      { class: 'stack' },
      el(
        'section',
        { class: 'card' },
        el(
          'div',
          { class: 'card__header' },
          el('div', { class: 'row' }, avatar(profile.email), el('h2', { text: profile.email })),
          roleBadge(profile.role),
        ),
        el(
          'div',
          { class: 'card__body' },
          el(
            'dl',
            { class: 'detail-list' },
            el('dt', { text: t('profile.field.id') }),
            el('dd', { class: 'mono', text: `#${profile.id}` }),
            el('dt', { text: t('profile.field.role') }),
            el('dd', {}, roleBadge(profile.role)),
            el('dt', { text: t('profile.field.manager') }),
            el('dd', { text: labelFor(profile.manager_id) ?? t('employee.noManager') }),
            el('dt', { text: t('profile.field.status') }),
            el('dd', {}, activeBadge(profile.is_active)),
            el('dt', { text: t('profile.field.created') }),
            el('dd', { text: formatDate(profile.created_at, { withTime: true }) }),
          ),
        ),
      ),
      el(
        'div',
        { class: 'grid-2' },
        formCard({ title: t('profile.changeEmail'), form: emailForm(profile, reload) }),
        formCard({ title: t('profile.changePassword'), form: passwordForm() }),
      ),
      el(
        'section',
        { class: 'card' },
        el('div', { class: 'card__header' }, el('h2', { text: t('profile.session') })),
        el(
          'div',
          { class: 'card__body stack-sm' },
          el('p', { class: 'field__hint', text: t('profile.sessionHint') }),
          el('div', {}, button(t('action.logout'), { iconName: 'logout', onClick: logout })),
        ),
      ),
    ),
  );
}

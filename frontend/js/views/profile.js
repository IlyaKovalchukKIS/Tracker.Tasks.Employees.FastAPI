/**
 * Own account: profile details, credential changes, and sign-out.
 */

import { users as usersApi } from '../core/api.js';
import { primeUser, resolveUsers } from '../core/directory.js';
import { formatDate, t } from '../core/i18n.js';
import { isEmployee } from '../core/permissions.js';
import { getUser, setUser } from '../core/session.js';
import { compact, validateEmail, validatePassword } from '../core/validate.js';
import { el } from '../ui/dom.js';
import { toast } from '../ui/feedback.js';
import { field, focusFirstError, formError, formSuccess, input, setFieldErrors, withPasswordToggle } from '../ui/forms.js';
import {
  activeBadge,
  avatar,
  button,
  card,
  detailList,
  pageHeader,
  personLink,
  roleBadge,
  setButtonLoading,
} from '../ui/primitives.js';

function emailForm(profile, onUpdated) {
  const emailInput = input({ type: 'email', value: profile.email, autocomplete: 'email' });
  const banner = formError();
  const success = formSuccess();
  const submit = button(t('action.save'), { variant: 'primary', type: 'submit' });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    banner,
    success,
    field({ name: 'email', label: t('profile.field.newEmail'), control: emailInput, required: true }),
    el('div', { class: 'form-actions' }, submit),
  );

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);
    success.setMessage(null);

    const email = emailInput.value.trim();
    const errors = compact({ email: validateEmail(email) });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(form);
      return;
    }
    if (email === profile.email) {
      success.setMessage(t('profile.emailUnchanged'));
      return;
    }

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
  const success = formSuccess();
  const submit = button(t('action.save'), { variant: 'primary', type: 'submit' });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    banner,
    success,
    field({
      name: 'password',
      label: t('profile.field.newPassword'),
      control: withPasswordToggle(passwordInput),
      hint: t('auth.password.hint'),
      required: true,
    }),
    field({
      name: 'passwordConfirm',
      label: t('auth.field.passwordConfirm'),
      control: withPasswordToggle(confirmInput),
      required: true,
    }),
    el('div', { class: 'form-actions' }, submit),
  );

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);
    success.setMessage(null);

    const password = passwordInput.value;
    const errors = compact({
      password: validatePassword(password),
      passwordConfirm: password && confirmInput.value !== password ? t('validation.passwordMismatch') : null,
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(form);
      return;
    }

    setButtonLoading(submit, true);
    try {
      setUser(await usersApi.updateMe({ password }));
      passwordInput.value = '';
      confirmInput.value = '';
      setFieldErrors(form, {});
      success.setMessage(t('profile.passwordUpdated'));
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
    pageHeader({ title: t('profile.title'), description: t('profile.subtitle') }),
    el(
      'div',
      { class: 'detail-columns detail-columns--reverse' },
      el(
        'div',
        { class: 'detail-columns__main stack' },
        card(
          { title: t('profile.changeEmail'), description: t('profile.changeEmail.description') },
          emailForm(profile, reload),
        ),
        card(
          { title: t('profile.changePassword'), description: t('profile.changePassword.description') },
          passwordForm(),
        ),
        card(
          { title: t('profile.session'), description: t('profile.sessionHint') },
          el('div', { class: 'form-actions' }, button(t('action.logout'), { iconName: 'logout', onClick: logout })),
        ),
      ),
      el(
        'div',
        { class: 'detail-columns__side' },
        card(
          {},
          el(
            'div',
            { class: 'profile-identity' },
            avatar(profile.email, { size: 'lg' }),
            el(
              'div',
              {},
              el('p', { class: 'profile-identity__email', text: profile.email }),
              roleBadge(profile.role),
            ),
          ),
          detailList([
            { label: t('profile.field.id'), value: el('span', { class: 'mono', text: `#${profile.id}` }) },
            ...(isEmployee(profile)
              ? [{ label: t('profile.field.manager'), value: profile.manager_id ? personLink(profile.manager_id) : t('employee.noManager') }]
              : []),
            { label: t('profile.field.status'), value: activeBadge(profile.is_active) },
            { label: t('profile.field.created'), value: formatDate(profile.created_at, { withTime: true }) },
          ]),
        ),
      ),
    ),
  );
}

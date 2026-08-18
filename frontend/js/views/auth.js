/**
 * Sign-in and registration screens.
 */

import { auth, users as usersApi } from '../api.js';
import { t } from '../i18n.js';
import { primeUser } from '../directory.js';
import { setUser } from '../session.js';
import {
  button,
  el,
  field,
  formError,
  icon,
  input,
  setButtonLoading,
  setFieldErrors,
  toast,
} from '../ui.js';
import { compact, validateEmail, validatePassword, MIN_PASSWORD_LENGTH } from '../validate.js';

function authCard({ title, subtitle, form, footer, callout }) {
  return el(
    'div',
    { class: 'auth-card' },
    el(
      'div',
      { class: 'auth-card__head' },
      el('h1', { text: title }),
      el('p', { class: 'auth-card__subtitle', text: subtitle }),
    ),
    el('div', { class: 'card' }, el('div', { class: 'card__body' }, form)),
    callout ?? null,
    footer,
  );
}

/** Load the profile once tokens are stored so the shell can render role-aware nav. */
async function completeSignIn(navigate, redirect) {
  const profile = await usersApi.me();
  setUser(profile);
  primeUser(profile);
  navigate(redirect || '#/tasks');
  return profile;
}

export function renderLogin({ navigate, query }) {
  const emailInput = input({ type: 'email', name: 'email', autocomplete: 'email', autofocus: true });
  const passwordInput = input({ type: 'password', name: 'password', autocomplete: 'current-password' });
  const banner = formError();

  const submit = button(t('auth.login.submit'), { variant: 'primary', type: 'submit', block: true });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit: onSubmit },
    banner,
    field({ name: 'email', label: t('auth.field.email'), control: emailInput, required: true }),
    field({ name: 'password', label: t('auth.field.password'), control: passwordInput, required: true }),
    submit,
  );

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const errors = compact({
      email: validateEmail(email),
      password: password ? null : t('validation.required'),
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setButtonLoading(submit, true);
    try {
      await auth.login(email, password);
      const profile = await completeSignIn(navigate, query.get('redirect'));
      toast(t('auth.loggedIn', { email: profile.email }), 'success');
    } catch (error) {
      banner.setMessage(error.message);
      setFieldErrors(form, error.fieldErrors ?? {});
    } finally {
      setButtonLoading(submit, false);
    }
  }

  return authCard({
    title: t('auth.login.title'),
    subtitle: t('auth.login.subtitle'),
    form,
    footer: el(
      'p',
      { class: 'auth-footer' },
      `${t('auth.login.noAccount')} `,
      el('a', { href: '#/register', text: t('auth.login.registerLink') }),
    ),
  });
}

export function renderRegister({ navigate }) {
  const emailInput = input({ type: 'email', name: 'email', autocomplete: 'email', autofocus: true });
  const passwordInput = input({ type: 'password', name: 'password', autocomplete: 'new-password' });
  const confirmInput = input({ type: 'password', name: 'passwordConfirm', autocomplete: 'new-password' });
  const banner = formError();

  const submit = button(t('auth.register.submit'), {
    variant: 'primary',
    type: 'submit',
    block: true,
  });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit: onSubmit },
    banner,
    field({ name: 'email', label: t('auth.field.email'), control: emailInput, required: true }),
    field({
      name: 'password',
      label: t('auth.field.password'),
      control: passwordInput,
      hint: t('auth.password.hint'),
      required: true,
    }),
    field({
      name: 'passwordConfirm',
      label: t('auth.field.passwordConfirm'),
      control: confirmInput,
      required: true,
    }),
    submit,
  );

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const errors = compact({
      email: validateEmail(email),
      password: validatePassword(password),
      passwordConfirm:
        password.length >= MIN_PASSWORD_LENGTH && confirmInput.value !== password
          ? t('validation.passwordMismatch')
          : null,
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setButtonLoading(submit, true);
    try {
      await auth.register(email, password);
      await auth.login(email, password);
      const profile = await completeSignIn(navigate);
      toast(t('auth.registered', { email: profile.email }), 'success');
    } catch (error) {
      banner.setMessage(error.message);
      setFieldErrors(form, error.fieldErrors ?? {});
    } finally {
      setButtonLoading(submit, false);
    }
  }

  return authCard({
    title: t('auth.register.title'),
    subtitle: t('auth.register.subtitle'),
    form,
    callout: el(
      'div',
      { class: 'callout', style: { marginTop: 'var(--space-4)' } },
      icon('info'),
      el('span', { text: t('auth.register.firstUserHint') }),
    ),
    footer: el(
      'p',
      { class: 'auth-footer' },
      `${t('auth.register.haveAccount')} `,
      el('a', { href: '#/login', text: t('auth.register.loginLink') }),
    ),
  });
}

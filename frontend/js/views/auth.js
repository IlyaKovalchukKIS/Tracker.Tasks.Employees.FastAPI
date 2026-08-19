/**
 * Sign-in and registration.
 *
 * Both screens share a split layout: a short product summary on wide viewports
 * and the form itself, which is all that remains on a phone.
 */

import { auth, users as usersApi } from '../core/api.js';
import { primeUser } from '../core/directory.js';
import { t } from '../core/i18n.js';
import { setUser } from '../core/session.js';
import { MIN_PASSWORD_LENGTH, compact, validateEmail, validatePassword } from '../core/validate.js';
import { el } from '../ui/dom.js';
import { toast } from '../ui/feedback.js';
import { field, focusFirstError, formError, input, setFieldErrors, withPasswordToggle } from '../ui/forms.js';
import { icon } from '../ui/icons.js';
import { button, setButtonLoading } from '../ui/primitives.js';

const HIGHLIGHT_KEYS = ['auth.highlight.assign', 'auth.highlight.track', 'auth.highlight.roles'];

function productPanel() {
  return el(
    'aside',
    { class: 'auth-panel', 'aria-hidden': 'true' },
    el('p', { class: 'auth-panel__eyebrow', text: t('app.name') }),
    el('p', { class: 'auth-panel__title', text: t('auth.panel.title') }),
    el(
      'ul',
      { class: 'auth-panel__list' },
      ...HIGHLIGHT_KEYS.map((key) =>
        el('li', { class: 'auth-panel__item' }, icon('checkCircle'), el('span', { text: t(key) })),
      ),
    ),
  );
}

function authScreen({ title, subtitle, form, footer, callout }) {
  return el(
    'div',
    { class: 'auth-screen' },
    productPanel(),
    el(
      'div',
      { class: 'auth-form-column' },
      el(
        'div',
        { class: 'auth-card' },
        el(
          'div',
          { class: 'auth-card__head' },
          el('h1', { text: title }),
          el('p', { class: 'auth-card__subtitle', text: subtitle }),
        ),
        form,
        callout ?? null,
      ),
      footer,
    ),
  );
}

/** Load the profile once tokens are stored so the shell can render role-aware navigation. */
async function completeSignIn(navigate, redirect) {
  const profile = await usersApi.me();
  setUser(profile);
  primeUser(profile);
  navigate(redirect || '#/dashboard');
  return profile;
}

export function renderLogin({ navigate, query }) {
  const emailInput = input({ type: 'email', name: 'email', autocomplete: 'email', autofocus: true });
  const passwordInput = input({ type: 'password', name: 'password', autocomplete: 'current-password' });
  const banner = formError();
  const submit = button(t('auth.login.submit'), { variant: 'primary', type: 'submit', block: true });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    banner,
    field({ name: 'email', label: t('auth.field.email'), control: emailInput, required: true }),
    field({
      name: 'password',
      label: t('auth.field.password'),
      control: withPasswordToggle(passwordInput),
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
      password: password ? null : t('validation.required'),
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(form);
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

  return authScreen({
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
  const submit = button(t('auth.register.submit'), { variant: 'primary', type: 'submit', block: true });

  const form = el(
    'form',
    { class: 'form', novalidate: true, onSubmit },
    banner,
    field({ name: 'email', label: t('auth.field.email'), control: emailInput, required: true }),
    field({
      name: 'password',
      label: t('auth.field.password'),
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
      focusFirstError(form);
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

  return authScreen({
    title: t('auth.register.title'),
    subtitle: t('auth.register.subtitle'),
    form,
    callout: el('div', { class: 'callout' }, icon('info'), el('span', { text: t('auth.register.firstUserHint') })),
    footer: el(
      'p',
      { class: 'auth-footer' },
      `${t('auth.register.haveAccount')} `,
      el('a', { href: '#/login', text: t('auth.register.loginLink') }),
    ),
  });
}

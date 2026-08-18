/**
 * Application shell: hash router, header, language and theme switchers.
 */

import { auth, isAuthenticated, setSessionExpiredHandler, users as usersApi } from './api.js';
import { invalidateDirectory, primeUser } from './directory.js';
import { LOCALES, getLocale, onLocaleChange, setLocale, t, translateDocument } from './i18n.js';
import { clearUser, getUser, setUser } from './session.js';
import {
  avatar,
  button,
  confirmDialog,
  el,
  emptyState,
  errorState,
  icon,
  pageLoader,
  renderInto,
  toast,
} from './ui.js';
import { renderLogin, renderRegister } from './views/auth.js';
import { renderEmployeeDetail, renderEmployeeList } from './views/employees.js';
import { renderProfile } from './views/profile.js';
import { renderTaskDetail, renderTaskList } from './views/tasks.js';
import { renderUsers } from './views/users.js';

const THEME_KEY = 'tracker.theme';

const routes = [
  { path: '/login', layout: 'auth', guestOnly: true, render: renderLogin, titleKey: 'auth.login.title' },
  { path: '/register', layout: 'auth', guestOnly: true, render: renderRegister, titleKey: 'auth.register.title' },
  { path: '/tasks', render: renderTaskList, titleKey: 'tasks.title' },
  { path: '/tasks/:id', render: renderTaskDetail, titleKey: 'task.detail.title' },
  { path: '/employees', render: renderEmployeeList, roles: ['ADMIN', 'MANAGER'], titleKey: 'employees.title' },
  { path: '/employees/:id', render: renderEmployeeDetail, titleKey: 'employee.detail.title' },
  { path: '/users', render: renderUsers, roles: ['ADMIN'], titleKey: 'users.title' },
  { path: '/profile', render: renderProfile, titleKey: 'profile.title' },
];

const NAV_ITEMS = [
  { href: '#/tasks', labelKey: 'nav.tasks', iconName: 'clipboard', match: '/tasks' },
  { href: '#/employees', labelKey: 'nav.employees', iconName: 'users', match: '/employees', roles: ['ADMIN', 'MANAGER'] },
  { href: '#/users', labelKey: 'nav.users', iconName: 'shield', match: '/users', roles: ['ADMIN'] },
  { href: '#/profile', labelKey: 'nav.profile', iconName: 'user', match: '/profile' },
];

/* ------------------------------------------------------------------ */
/* Routing helpers                                                     */
/* ------------------------------------------------------------------ */

function parseLocation() {
  const raw = location.hash.replace(/^#/, '');
  const [rawPath, rawSearch = ''] = raw.split('?');
  const path = rawPath && rawPath !== '/' ? rawPath.replace(/\/+$/, '') : '/';
  return { path: path.startsWith('/') ? path : `/${path}`, query: new URLSearchParams(rawSearch) };
}

function matchRoute(path) {
  const segments = path.split('/').filter(Boolean);
  for (const route of routes) {
    const pattern = route.path.split('/').filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const params = {};
    const matched = pattern.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(segments[index]);
        return true;
      }
      return part === segments[index];
    });
    if (matched) return { route, params };
  }
  return null;
}

function navigate(target, { replace = false } = {}) {
  const hash = target.startsWith('#') ? target : `#${target}`;
  if (location.hash === hash) {
    render();
    return;
  }
  if (replace) {
    history.replaceState(null, '', hash);
    render();
  } else {
    location.hash = hash;
  }
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage unavailable */
  }
  renderHeader();
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function languageSwitcher() {
  return el(
    'div',
    { class: 'segmented', role: 'group', 'aria-label': t('a11y.language') },
    ...LOCALES.map((entry) =>
      el('button', {
        type: 'button',
        class: 'segmented__option',
        lang: entry.code,
        text: entry.label,
        title: entry.name,
        'aria-label': entry.name,
        'aria-pressed': String(entry.code === getLocale()),
        onClick: () => setLocale(entry.code),
      }),
    ),
  );
}

function themeToggle() {
  const dark = currentTheme() === 'dark';
  return button('', {
    variant: 'ghost',
    iconName: dark ? 'sun' : 'moon',
    'aria-label': dark ? t('theme.switchToLight') : t('theme.switchToDark'),
    title: dark ? t('theme.switchToLight') : t('theme.switchToDark'),
    onClick: toggleTheme,
  });
}

function docsLink() {
  return el(
    'a',
    {
      class: 'btn btn--ghost btn--icon',
      href: '/docs',
      target: '_blank',
      rel: 'noopener',
      'aria-label': t('action.openDocs'),
      title: t('action.openDocs'),
    },
    icon('link'),
  );
}

function brand() {
  return el(
    'a',
    { class: 'brand', href: '#/tasks' },
    el('span', { class: 'brand__mark' }, icon('check')),
    el('span', { text: t('app.name') }),
  );
}

function appHeader(activePath) {
  const user = getUser();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  const nav = el(
    'nav',
    { class: 'app-nav', 'aria-label': t('nav.primary') },
    ...visibleItems.map((item) =>
      el(
        'a',
        {
          class: 'app-nav__link',
          href: item.href,
          'aria-current': activePath.startsWith(item.match) ? 'page' : null,
          onClick: () => nav.classList.remove('is-open'),
        },
        icon(item.iconName),
        el('span', { text: t(item.labelKey) }),
      ),
    ),
  );

  const toggle = button('', {
    variant: 'ghost',
    iconName: 'menu',
    class: 'btn btn--ghost btn--icon nav-toggle',
    'aria-label': t('nav.toggle'),
    'aria-expanded': 'false',
    onClick: () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    },
  });

  return el(
    'header',
    { class: 'app-header' },
    el(
      'div',
      { class: 'app-header__inner' },
      brand(),
      nav,
      toggle,
      el(
        'div',
        { class: 'header-tools' },
        languageSwitcher(),
        themeToggle(),
        docsLink(),
        user
          ? el(
              'div',
              { class: 'header-user' },
              el(
                'div',
                { class: 'header-user__meta' },
                el('span', { class: 'header-user__email', text: user.email, title: user.email }),
                el('span', { class: 'header-user__role', text: t(`role.${user.role}`) }),
              ),
              avatar(user.email),
              button('', {
                variant: 'ghost',
                iconName: 'logout',
                'aria-label': t('action.logout'),
                title: t('action.logout'),
                onClick: logout,
              }),
            )
          : null,
      ),
    ),
  );
}

function authHeader() {
  return el(
    'div',
    { class: 'auth-topbar' },
    brand(),
    el('div', { class: 'header-tools' }, languageSwitcher(), themeToggle(), docsLink()),
  );
}

let headerState = { layout: 'app', path: '/' };

function renderHeader(state = headerState) {
  headerState = state;
  const isAuthLayout = state.layout === 'auth';
  document.getElementById('main').classList.toggle('main--auth', isAuthLayout);
  renderInto(document.getElementById('header-root'), isAuthLayout ? authHeader() : appHeader(state.path));
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

async function logout() {
  const confirmed = await confirmDialog({
    title: t('auth.logout.title'),
    message: t('auth.logout.message'),
    confirmLabel: t('action.logout'),
  });
  if (!confirmed) return;

  await auth.logout();
  clearUser();
  invalidateDirectory();
  navigate('#/login');
  toast(t('auth.loggedOut'), 'info');
}

setSessionExpiredHandler(() => {
  clearUser();
  invalidateDirectory();
  toast(t('auth.sessionExpired'), 'error');
  const current = location.hash && !location.hash.startsWith('#/login') ? location.hash : '';
  navigate(current ? `#/login?redirect=${encodeURIComponent(current)}` : '#/login');
});

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

const main = document.getElementById('main');
let previousPath = null;
let renderToken = 0;

async function render() {
  const token = (renderToken += 1);
  const { path, query } = parseLocation();

  if (path === '/') {
    navigate(isAuthenticated() ? '#/tasks' : '#/login', { replace: true });
    return;
  }

  const match = matchRoute(path);
  if (!match) {
    renderHeader({ layout: isAuthenticated() ? 'app' : 'auth', path });
    renderInto(
      main,
      emptyState({
        iconName: 'search',
        title: t('error.notFound.title'),
        description: t('error.notFound.description'),
        action: button(t('action.backToTasks'), { iconName: 'arrowLeft', onClick: () => navigate('#/tasks') }),
      }),
    );
    return;
  }

  const { route, params } = match;

  if (route.guestOnly && isAuthenticated()) {
    navigate('#/tasks', { replace: true });
    return;
  }

  if (!route.guestOnly && !isAuthenticated()) {
    navigate(`#/login?redirect=${encodeURIComponent(location.hash)}`, { replace: true });
    return;
  }

  renderHeader({ layout: route.layout === 'auth' ? 'auth' : 'app', path });
  main.setAttribute('aria-busy', 'true');
  renderInto(main, pageLoader());

  // The profile drives role-aware navigation, so it must be loaded before any
  // protected view renders.
  if (!route.guestOnly && !getUser()) {
    try {
      const profile = await usersApi.me();
      setUser(profile);
      primeUser(profile);
      renderHeader({ layout: 'app', path });
    } catch (error) {
      if (token !== renderToken) return;
      main.removeAttribute('aria-busy');
      renderInto(main, errorState({ message: error.message, onRetry: render }));
      return;
    }
  }

  if (token !== renderToken) return;

  if (route.roles && !route.roles.includes(getUser()?.role)) {
    main.removeAttribute('aria-busy');
    renderInto(
      main,
      emptyState({
        iconName: 'slash',
        title: t('error.accessDenied.title'),
        description: t('error.accessDenied.description'),
        action: button(t('action.backToTasks'), { iconName: 'arrowLeft', onClick: () => navigate('#/tasks') }),
      }),
    );
    return;
  }

  document.title = `${t(route.titleKey)} · ${t('app.name')}`;

  try {
    const view = await route.render({ params, query, navigate, reload: render, logout });
    if (token !== renderToken) return;
    renderInto(main, view);
  } catch (error) {
    if (token !== renderToken) return;
    renderInto(main, errorState({ message: error.message || t('error.loadFailed'), onRetry: render }));
  } finally {
    if (token === renderToken) main.removeAttribute('aria-busy');
  }

  // Move focus and scroll only when the route actually changed, so switching
  // language or reloading data does not disturb the reader's position.
  if (path !== previousPath) {
    previousPath = path;
    window.scrollTo({ top: 0 });
    main.focus({ preventScroll: true });
  }
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */

translateDocument();
document.documentElement.lang = getLocale();

onLocaleChange(() => {
  translateDocument();
  const scrollY = window.scrollY;
  render().then(() => window.scrollTo({ top: scrollY }));
});

window.addEventListener('hashchange', render);
render();

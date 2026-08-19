/**
 * Application entry point: routes, access guards, and session lifecycle.
 */

import { auth, users as usersApi } from './core/api.js';
import { invalidateDirectory, primeUser } from './core/directory.js';
import { getLocale, onLocaleChange, t, translateDocument } from './core/i18n.js';
import { matchRoute, navigate, parseLocation, rerender, startRouter } from './core/router.js';
import { setSessionExpiredHandler } from './core/http.js';
import { clearUser, getUser, setUser } from './core/session.js';
import { hasSession } from './core/tokens.js';
import { mountShell, updateShell } from './layout/shell.js';
import { renderInto } from './ui/dom.js';
import { confirmDialog, toast } from './ui/feedback.js';
import { button } from './ui/primitives.js';
import { emptyState, errorState, pageLoader } from './ui/states.js';
import { renderLogin, renderRegister } from './views/auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderEmployeeDetail, renderEmployeeList } from './views/employees.js';
import { renderProfile } from './views/profile.js';
import { renderTaskDetail } from './views/tasks/detail.js';
import { renderTaskList } from './views/tasks/list.js';
import { renderUsers } from './views/users.js';

const HOME = '#/dashboard';

const routes = [
  {
    path: '/login',
    layout: 'auth',
    guestOnly: true,
    render: renderLogin,
    titleKey: 'auth.login.title',
  },
  {
    path: '/register',
    layout: 'auth',
    guestOnly: true,
    render: renderRegister,
    titleKey: 'auth.register.title',
  },
  {
    path: '/dashboard',
    render: renderDashboard,
    titleKey: 'dashboard.title',
    crumbKey: 'nav.dashboard',
  },
  { path: '/tasks', render: renderTaskList, titleKey: 'tasks.title', crumbKey: 'nav.tasks' },
  { path: '/tasks/:id', render: renderTaskDetail, titleKey: 'task.detail.title', crumbKey: 'nav.tasks' },
  {
    path: '/employees',
    render: renderEmployeeList,
    roles: ['ADMIN', 'MANAGER'],
    titleKey: 'employees.title',
    crumbKey: 'nav.employees',
  },
  {
    path: '/employees/:id',
    render: renderEmployeeDetail,
    titleKey: 'employee.detail.title',
    crumbKey: 'nav.employees',
  },
  { path: '/users', render: renderUsers, roles: ['ADMIN'], titleKey: 'users.title', crumbKey: 'nav.users' },
  { path: '/profile', render: renderProfile, titleKey: 'profile.title', crumbKey: 'nav.profile' },
];

const main = () => document.getElementById('main');

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
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

let renderToken = 0;
let previousPath = null;

const notFoundView = () =>
  emptyState({
    iconName: 'search',
    title: t('error.notFound.title'),
    description: t('error.notFound.description'),
    action: button(t('action.backToDashboard'), { iconName: 'arrowLeft', onClick: () => navigate(HOME) }),
  });

const accessDeniedView = () =>
  emptyState({
    iconName: 'shield',
    title: t('error.accessDenied.title'),
    description: t('error.accessDenied.description'),
    action: button(t('action.backToDashboard'), { iconName: 'arrowLeft', onClick: () => navigate(HOME) }),
  });

async function render() {
  const token = (renderToken += 1);
  const { path, query } = parseLocation();

  if (path === '/') {
    navigate(hasSession() ? HOME : '#/login', { replace: true });
    return;
  }

  const match = matchRoute(routes, path);
  if (!match) {
    updateShell({ layout: hasSession() ? 'app' : 'auth', path, breadcrumb: [] });
    renderInto(main(), notFoundView());
    return;
  }

  const { route, params } = match;

  if (route.guestOnly && hasSession()) {
    navigate(HOME, { replace: true });
    return;
  }

  if (!route.guestOnly && !hasSession()) {
    navigate(`#/login?redirect=${encodeURIComponent(location.hash)}`, { replace: true });
    return;
  }

  updateShell({
    layout: route.layout === 'auth' ? 'auth' : 'app',
    path,
    breadcrumb: route.crumbKey ? [{ label: t(route.crumbKey) }] : [],
  });

  document.title = `${t(route.titleKey)} · ${t('app.name')}`;
  main().setAttribute('aria-busy', 'true');
  renderInto(main(), pageLoader());

  // The profile drives role-aware navigation, so it must be loaded before any
  // protected view renders.
  if (!route.guestOnly && !getUser()) {
    try {
      const profile = await usersApi.me();
      if (token !== renderToken) return;
      setUser(profile);
      primeUser(profile);
      updateShell({
        layout: 'app',
        path,
        breadcrumb: route.crumbKey ? [{ label: t(route.crumbKey) }] : [],
      });
    } catch (error) {
      if (token !== renderToken) return;
      main().removeAttribute('aria-busy');
      renderInto(main(), errorState({ error, onRetry: render }));
      return;
    }
  }

  if (route.roles && !route.roles.includes(getUser()?.role)) {
    main().removeAttribute('aria-busy');
    renderInto(main(), accessDeniedView());
    return;
  }

  try {
    const view = await route.render({ params, query, navigate, reload: render, logout });
    if (token !== renderToken) return;
    renderInto(main(), view);
  } catch (error) {
    if (token !== renderToken) return;
    renderInto(main(), errorState({ error, onRetry: render }));
  } finally {
    if (token === renderToken) main().removeAttribute('aria-busy');
  }

  // Focus and scroll move only when the route actually changed, so reloading
  // data or switching language does not disturb the reader's position.
  if (path !== previousPath) {
    previousPath = path;
    window.scrollTo({ top: 0 });
    main().focus({ preventScroll: true });
  }
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */

document.documentElement.lang = getLocale();
translateDocument();
mountShell({ onLogout: logout });

onLocaleChange(() => {
  translateDocument();
  const scrollY = window.scrollY;
  Promise.resolve(rerender()).then(() => window.scrollTo({ top: scrollY }));
});

startRouter(render);

/**
 * Application shell: sidebar navigation, top bar, and the mobile drawer.
 *
 * The shell is rebuilt when the profile or the language changes and updated in
 * place for everything else, so the current route, the theme toggle and the
 * drawer never fight each other for focus.
 */

import { LOCALES, getLocale, roleLabel, setLocale, t } from '../core/i18n.js';
import { canManageUsers, canViewDirectory } from '../core/permissions.js';
import { navigate } from '../core/router.js';
import { getUser, onUserChange } from '../core/session.js';
import { getTheme, toggleTheme } from '../core/theme.js';
import { el, renderInto, watchMedia } from '../ui/dom.js';
import { menu } from '../ui/feedback.js';
import { icon } from '../ui/icons.js';
import { avatar, button } from '../ui/primitives.js';

const DRAWER_QUERY = '(max-width: 767px)';

const NAV_SECTIONS = [
  {
    titleKey: 'nav.section.work',
    items: [
      { path: '/dashboard', labelKey: 'nav.dashboard', iconName: 'dashboard' },
      { path: '/tasks', labelKey: 'nav.tasks', iconName: 'clipboard' },
    ],
  },
  {
    titleKey: 'nav.section.team',
    visible: (user) => canViewDirectory(user),
    items: [
      { path: '/employees', labelKey: 'nav.employees', iconName: 'users', visible: canViewDirectory },
      { path: '/users', labelKey: 'nav.users', iconName: 'shield', visible: canManageUsers },
    ],
  },
  {
    titleKey: 'nav.section.account',
    items: [{ path: '/profile', labelKey: 'nav.profile', iconName: 'user' }],
  },
];

let state = { layout: 'app', path: '/', breadcrumb: [] };
let drawerOpen = false;
let isDrawerLayout = false;
let onLogout = () => {};
let restoreLanguageFocus = false;

const root = () => document.getElementById('header-root');

/* ------------------------------------------------------------------ */
/* Shared controls                                                     */
/* ------------------------------------------------------------------ */

function brand({ compact = false } = {}) {
  return el(
    'a',
    { class: 'brand', href: '#/dashboard', 'aria-label': t('app.name') },
    el('span', { class: 'brand__mark' }, icon('check')),
    compact ? null : el('span', { class: 'brand__name', text: t('app.name') }),
  );
}

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
        dataset: { locale: entry.code },
        onClick: () => {
          restoreLanguageFocus = true;
          setLocale(entry.code);
        },
      }),
    ),
  );
}

/** Updates its own icon and label so switching theme never moves focus. */
function themeToggle() {
  const control = button('', { variant: 'ghost', onClick: () => {
    toggleTheme();
    paint();
  } });

  function paint() {
    const dark = getTheme() === 'dark';
    const label = dark ? t('theme.switchToLight') : t('theme.switchToDark');
    renderInto(control, icon(dark ? 'sun' : 'moon'));
    control.setAttribute('aria-label', label);
    control.title = label;
  }

  paint();
  return control;
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
    icon('external'),
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function navLink(item, activePath) {
  const label = t(item.labelKey);
  const current = activePath === item.path || activePath.startsWith(`${item.path}/`);
  return el(
    'li',
    {},
    el(
      'a',
      {
        class: 'nav-link',
        href: `#${item.path}`,
        'aria-current': current ? 'page' : null,
        'aria-label': label,
        title: label,
      },
      icon(item.iconName),
      el('span', { class: 'nav-link__label', text: label }),
    ),
  );
}

function sidebarNav(user, activePath) {
  const sections = NAV_SECTIONS.filter((section) => !section.visible || section.visible(user)).map((section) => {
    const items = section.items.filter((item) => !item.visible || item.visible(user));
    if (items.length === 0) return null;
    return el(
      'div',
      { class: 'nav-section' },
      el('p', { class: 'nav-section__title', text: t(section.titleKey) }),
      el('ul', { class: 'nav-list' }, ...items.map((item) => navLink(item, activePath))),
    );
  });

  return el('nav', { class: 'sidebar__nav', 'aria-label': t('nav.primary') }, ...sections.filter(Boolean));
}

function userCard(user) {
  if (!user) return null;

  const trigger = el(
    'button',
    { type: 'button', class: 'user-card', 'aria-label': t('nav.accountMenu') },
    avatar(user.email),
    el(
      'span',
      { class: 'user-card__text' },
      el('span', { class: 'user-card__email', text: user.email }),
      el('span', { class: 'user-card__role', text: roleLabel(user.role) }),
    ),
    el('span', { class: 'user-card__chevron' }, icon('chevronDown')),
  );

  return menu({
    trigger,
    align: 'start',
    label: t('nav.accountMenu'),
    items: [
      { label: t('nav.profile'), iconName: 'user', onSelect: () => navigate('#/profile') },
      { label: t('action.openDocs'), iconName: 'external', href: '/docs', external: true },
      { separator: true },
      { label: t('action.logout'), iconName: 'logout', danger: true, onSelect: () => onLogout() },
    ],
  });
}

function sidebar(user, activePath) {
  return el(
    'aside',
    { class: 'sidebar', id: 'app-sidebar' },
    el(
      'div',
      { class: 'sidebar__head' },
      brand(),
      button('', {
        variant: 'ghost',
        iconName: 'x',
        class: 'sidebar__close',
        'aria-label': t('nav.close'),
        onClick: () => setDrawerOpen(false, { restoreFocus: true }),
      }),
    ),
    sidebarNav(user, activePath),
    el('div', { class: 'sidebar__footer' }, userCard(user)),
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

function breadcrumbTrail(items) {
  if (items.length === 0) return el('span', { class: 'breadcrumb__current', text: '' });

  return el(
    'nav',
    { class: 'breadcrumb', 'aria-label': t('nav.breadcrumb') },
    el(
      'ol',
      { class: 'breadcrumb__list' },
      ...items.map((item, index) => {
        const last = index === items.length - 1;
        return el(
          'li',
          { class: 'breadcrumb__item' },
          last || !item.href
            ? el('span', { class: 'breadcrumb__current', 'aria-current': last ? 'page' : null, text: item.label })
            : el('a', { href: item.href, text: item.label }),
          last ? null : el('span', { class: 'breadcrumb__separator', 'aria-hidden': 'true' }, icon('chevronRight')),
        );
      }),
    ),
  );
}

function topbar() {
  const toggle = button('', {
    variant: 'ghost',
    iconName: 'menu',
    class: 'topbar__nav-toggle',
    'aria-label': t('nav.open'),
    'aria-controls': 'app-sidebar',
    'aria-expanded': 'false',
    onClick: () => setDrawerOpen(true),
  });

  return el(
    'header',
    { class: 'topbar' },
    toggle,
    el('div', { class: 'topbar__brand' }, brand({ compact: true })),
    breadcrumbTrail(state.breadcrumb),
    el('div', { class: 'topbar__tools' }, languageSwitcher(), themeToggle(), docsLink()),
  );
}

/** Slim bar used by the sign-in and registration screens. */
function authBar() {
  return el(
    'header',
    { class: 'auth-bar' },
    brand(),
    el('div', { class: 'topbar__tools' }, languageSwitcher(), themeToggle(), docsLink()),
  );
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

function setDrawerOpen(open, { restoreFocus = false } = {}) {
  drawerOpen = open && isDrawerLayout;
  document.body.dataset.navOpen = String(drawerOpen);
  document.body.classList.toggle('is-locked', drawerOpen);

  const sidebarNode = document.getElementById('app-sidebar');
  const toggle = root()?.querySelector('.topbar__nav-toggle');
  toggle?.setAttribute('aria-expanded', String(drawerOpen));
  syncSidebarReachability();

  if (drawerOpen) sidebarNode?.querySelector('.nav-link')?.focus();
  else if (restoreFocus) toggle?.focus();
}

/**
 * Keep the off-screen drawer out of the tab order, otherwise focus would jump
 * to invisible links on small screens.
 */
function syncSidebarReachability() {
  const sidebarNode = document.getElementById('app-sidebar');
  if (!sidebarNode) return;
  if (isDrawerLayout && !drawerOpen) sidebarNode.setAttribute('inert', '');
  else sidebarNode.removeAttribute('inert');
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  const container = root();
  if (!container) return;

  document.body.dataset.layout = state.layout;

  if (state.layout === 'auth') {
    renderInto(container, authBar());
    return;
  }

  const user = getUser();
  renderInto(
    container,
    sidebar(user, state.path),
    el('div', { class: 'nav-scrim', onClick: () => setDrawerOpen(false, { restoreFocus: true }) }),
    topbar(),
  );

  setDrawerOpen(drawerOpen);

  if (restoreLanguageFocus) {
    restoreLanguageFocus = false;
    container.querySelector(`.segmented__option[data-locale="${getLocale()}"]`)?.focus();
  }
}

/** Update the shell for the current route. */
export function updateShell({ layout, path, breadcrumb = [] }) {
  state = { layout, path, breadcrumb };
  drawerOpen = false;
  render();
}

/**
 * Replace the breadcrumb trail once a detail view knows what it is showing.
 */
export function setBreadcrumb(items) {
  state.breadcrumb = items;
  const container = root();
  if (state.layout !== 'app' || !container) return;
  const existing = container.querySelector('.breadcrumb, .breadcrumb__current');
  existing?.replaceWith(breadcrumbTrail(items));
}

/** Build the shell once and keep it in sync with the session and the viewport. */
export function mountShell({ onLogout: logoutHandler }) {
  onLogout = logoutHandler;

  watchMedia(DRAWER_QUERY, (matches) => {
    isDrawerLayout = matches;
    if (!matches && drawerOpen) setDrawerOpen(false);
    else syncSidebarReachability();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawerOpen) setDrawerOpen(false, { restoreFocus: true });
  });

  onUserChange(() => render());
  render();
}

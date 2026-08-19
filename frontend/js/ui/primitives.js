/**
 * Buttons, badges, avatars, cards, and the small inline metadata used to
 * describe a task at a glance.
 */

import { deadlineState } from '../core/deadline.js';
import { getCachedUser } from '../core/directory.js';
import { PRIORITY_TONE, ROLE_TONE, STATUS_TONE } from '../core/domain.js';
import { formatDate, formatRelative, roleLabel, t, taskPriorityLabel, taskStatusLabel } from '../core/i18n.js';
import { canViewDirectory } from '../core/permissions.js';
import { getUser } from '../core/session.js';
import { el } from './dom.js';
import { icon } from './icons.js';

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

/**
 * @param {string} label Visible text; omit it for an icon-only button and pass
 *   an `aria-label` instead.
 * @param {object} options `variant` (primary | danger | ghost | subtle),
 *   `size` (sm), `iconName`, `trailingIconName`, `block`, plus any DOM property.
 */
export function button(label, { variant = 'default', iconName, trailingIconName, size, block = false, type = 'button', ...props } = {}) {
  const classes = ['btn'];
  if (variant !== 'default') classes.push(`btn--${variant}`);
  if (size) classes.push(`btn--${size}`);
  if (block) classes.push('btn--block');
  if (!label) classes.push('btn--icon');
  if (props.class) classes.push(props.class);

  return el(
    'button',
    { ...props, type, class: classes.join(' ') },
    iconName ? icon(iconName) : null,
    label ? el('span', { text: label }) : null,
    trailingIconName ? icon(trailingIconName) : null,
  );
}

/** Anchor styled as a button, for links that leave the application. */
export function linkButton(label, { href, iconName, variant = 'default', size, ...props } = {}) {
  const classes = ['btn'];
  if (variant !== 'default') classes.push(`btn--${variant}`);
  if (size) classes.push(`btn--${size}`);
  if (!label) classes.push('btn--icon');

  return el(
    'a',
    { ...props, href, class: classes.join(' ') },
    iconName ? icon(iconName) : null,
    label ? el('span', { text: label }) : null,
  );
}

/** Show progress inside a button and block repeat submissions. */
export function setButtonLoading(node, loading) {
  node.classList.toggle('btn--loading', loading);
  node.disabled = loading;
  if (loading) node.setAttribute('aria-busy', 'true');
  else node.removeAttribute('aria-busy');
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function badge(text, tone = 'neutral', { dot = true } = {}) {
  return el('span', { class: `badge badge--${tone}${dot ? '' : ' badge--flat'}`, text });
}

export const statusBadge = (status) => badge(taskStatusLabel(status), STATUS_TONE[status] ?? 'neutral');

export const priorityBadge = (priority) =>
  badge(taskPriorityLabel(priority), PRIORITY_TONE[priority] ?? 'neutral', { dot: false });

export const roleBadge = (role) => badge(roleLabel(role), ROLE_TONE[role] ?? 'neutral', { dot: false });

export const activeBadge = (isActive) =>
  badge(isActive ? t('status.active') : t('status.inactive'), isActive ? 'success' : 'muted');

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function avatar(email, { size } = {}) {
  return el('span', {
    class: `avatar${size ? ` avatar--${size}` : ''}`,
    'aria-hidden': 'true',
    text: (email || '?').charAt(0),
  });
}

/** Avatar plus email, the standard way a person is shown in lists. */
export function personChip(email, { subtitle, size } = {}) {
  return el(
    'span',
    { class: 'person' },
    avatar(email, { size }),
    el(
      'span',
      { class: 'person__text' },
      el('span', { class: 'person__name', text: email }),
      subtitle ? el('span', { class: 'person__meta', text: subtitle }) : null,
    ),
  );
}

/**
 * Email of a user, linked to their employee profile when the current role
 * is allowed to open it. Falls back to plain text for unknown or unreadable ids.
 */
export function personLink(id, { unassigned = t('task.unassigned') } = {}) {
  if (!id) return el('span', { class: 'cell-muted--soft', text: unassigned });
  const person = getCachedUser(id);
  const label = person?.email ?? `#${id}`;
  if (person && canViewDirectory(getUser())) {
    return el('a', { class: 'person-link', href: `#/employees/${id}`, text: label });
  }
  return el('span', { class: 'cell-email', text: label });
}

/* ------------------------------------------------------------------ */
/* Inline metadata                                                     */
/* ------------------------------------------------------------------ */

/** Icon plus text, used for deadlines, assignees, and timestamps. */
export function meta(iconName, text, { tone, title } = {}) {
  return el(
    'span',
    { class: `meta${tone ? ` meta--${tone}` : ''}`, title },
    icon(iconName),
    el('span', { text }),
  );
}

const DEADLINE_TONE = { overdue: 'danger', soon: 'warning' };

/**
 * Deadline with its urgency made visible: overdue and imminent work is
 * coloured, everything else stays quiet.
 *
 * @param {object} options `compact` drops the time, which lists and table rows
 *   do not have room for; `relative` prepends "in 3 days" style wording.
 */
export function deadlineMeta(deadline, status, { relative = false, compact = false } = {}) {
  const { state, due } = deadlineState(deadline, status);
  if (!due) return meta('calendar', t('task.noDeadline'));

  const full = formatDate(deadline, { withTime: true });
  const shown = compact ? formatDate(deadline) : full;
  const suffix = { overdue: t('task.overdue'), soon: t('task.dueSoon') }[state];
  const text = relative ? `${formatRelative(deadline)} · ${shown}` : shown;

  return meta(state === 'overdue' ? 'alertTriangle' : 'clock', suffix ? `${text} · ${suffix}` : text, {
    tone: DEADLINE_TONE[state],
    title: compact ? full : undefined,
  });
}

export const monospace = (text) => el('span', { class: 'mono', text });

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

/**
 * A card with an optional titled header.
 *
 * @param {object} options `title` renders as a heading at `headingLevel`
 *   (default `h2`), `actions` sit on the opposite side of the header.
 */
export function card({ title, description, actions, headingLevel = 'h2', bodyClass = '', padded = true } = {}, ...children) {
  const header =
    title || actions
      ? el(
          'div',
          { class: 'card__header' },
          el(
            'div',
            { class: 'card__heading' },
            title ? el(headingLevel, { text: title }) : null,
            description ? el('p', { class: 'card__description', text: description }) : null,
          ),
          actions ? el('div', { class: 'card__actions' }, actions) : null,
        )
      : null;

  return el(
    'section',
    { class: 'card' },
    header,
    el('div', { class: `${padded ? 'card__body' : 'card__body card__body--flush'} ${bodyClass}`.trim() }, ...children),
  );
}

/** Page title block with an optional description and action area. */
export function pageHeader({ title, description, actions, eyebrow } = {}) {
  return el(
    'div',
    { class: 'page-header' },
    el(
      'div',
      { class: 'page-header__text' },
      eyebrow ? el('p', { class: 'page-header__eyebrow', text: eyebrow }) : null,
      el('h1', { text: title }),
      description ? el('p', { class: 'page-header__description', text: description }) : null,
    ),
    actions ? el('div', { class: 'page-header__actions' }, actions) : null,
  );
}

/** Label and value pairs, used on every detail page. */
export function detailList(entries) {
  return el(
    'dl',
    { class: 'detail-list' },
    ...entries.flatMap(({ label, value }) => [
      el('dt', { text: label }),
      el('dd', {}, value instanceof Node ? value : el('span', { text: value ?? '—' })),
    ]),
  );
}

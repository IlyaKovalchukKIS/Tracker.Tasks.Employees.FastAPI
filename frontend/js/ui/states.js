/**
 * Loading, empty, and error placeholders.
 *
 * Every screen that depends on the API uses these, so a slow request, a missing
 * record, and an empty result all look deliberate instead of broken.
 */

import { ERROR_KIND } from '../core/api-error.js';
import { t } from '../core/i18n.js';
import { el } from './dom.js';
import { icon } from './icons.js';
import { button } from './primitives.js';

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export const skeleton = (width = '100%', height = '12px') =>
  el('span', { class: 'skeleton', style: { width, height } });

export function skeletonCards(count = 4) {
  return el(
    'div',
    { class: 'card-list', 'aria-busy': 'true', 'aria-label': t('a11y.loading') },
    ...Array.from({ length: count }, () =>
      el(
        'div',
        { class: 'skeleton-card' },
        skeleton('45%', '16px'),
        skeleton('85%'),
        skeleton('30%'),
      ),
    ),
  );
}

export function skeletonRows(rows = 6, columns = 5) {
  return el(
    'div',
    { class: 'skeleton-table', 'aria-busy': 'true', 'aria-label': t('a11y.loading') },
    ...Array.from({ length: rows }, () =>
      el(
        'div',
        { class: 'skeleton-table__row', style: { gridTemplateColumns: `repeat(${columns}, 1fr)` } },
        ...Array.from({ length: columns }, (_unused, index) => skeleton(index === 0 ? '80%' : '55%')),
      ),
    ),
  );
}

export function skeletonStats(count = 4) {
  return el(
    'div',
    { class: 'stat-grid', 'aria-busy': 'true', 'aria-label': t('a11y.loading') },
    ...Array.from({ length: count }, () =>
      el('div', { class: 'stat stat--loading' }, skeleton('55%'), skeleton('40%', '28px')),
    ),
  );
}

export function pageLoader() {
  return el(
    'div',
    { class: 'page-loader', role: 'status', 'aria-label': t('a11y.loading') },
    el('span', { class: 'spinner' }),
  );
}

/* ------------------------------------------------------------------ */
/* Empty and error                                                     */
/* ------------------------------------------------------------------ */

/**
 * Explain that there is nothing here yet and offer the action that fixes it.
 */
export function emptyState({ iconName = 'inbox', title, description, action, compact = false }) {
  return el(
    'div',
    { class: `state${compact ? ' state--compact' : ''}` },
    el('div', { class: 'state__icon' }, icon(iconName)),
    el('h2', { class: 'state__title', text: title }),
    description ? el('p', { class: 'state__description', text: description }) : null,
    action ?? null,
  );
}

const ERROR_PRESENTATION = {
  [ERROR_KIND.NETWORK]: { iconName: 'slash', titleKey: 'error.state.network.title' },
  [ERROR_KIND.FORBIDDEN]: { iconName: 'shield', titleKey: 'error.state.forbidden.title', retryable: false },
  [ERROR_KIND.NOT_FOUND]: { iconName: 'search', titleKey: 'error.state.notFound.title', retryable: false },
  [ERROR_KIND.SERVER]: { iconName: 'alertTriangle', titleKey: 'error.state.server.title' },
};

/**
 * Report a failure with a recovery action.
 *
 * @param {object} options
 * @param {import('../core/api-error.js').ApiError|Error} options.error
 * @param {() => void} [options.onRetry] Offered when retrying can help.
 * @param {Node} [options.action] Extra action, such as returning to a list.
 */
export function errorState({ error, onRetry, action, compact = false }) {
  const presentation = ERROR_PRESENTATION[error?.kind] ?? { iconName: 'alertTriangle', titleKey: 'error.state.generic.title' };
  const canRetry = onRetry && presentation.retryable !== false;

  return el(
    'div',
    { class: `state state--error${compact ? ' state--compact' : ''}`, role: 'alert' },
    el('div', { class: 'state__icon' }, icon(presentation.iconName)),
    el('h2', { class: 'state__title', text: t(presentation.titleKey) }),
    el('p', { class: 'state__description', text: error?.message || t('error.kind.unknown') }),
    el(
      'div',
      { class: 'state__actions' },
      canRetry ? button(t('action.retry'), { iconName: 'refresh', variant: 'primary', onClick: onRetry }) : null,
      action ?? null,
    ),
  );
}

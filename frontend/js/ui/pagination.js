/**
 * Pagination controls for the task list.
 */

import { formatNumber, t } from '../core/i18n.js';
import { pageCount } from '../core/task-filters.js';
import { el } from './dom.js';
import { button } from './primitives.js';

/**
 * Previous / next controls with the current position.
 * Returns `null` when everything fits on a single page.
 */
export function pagination({ response, onChange }) {
  const pages = pageCount(response);
  if (pages <= 1) return null;

  return el(
    'nav',
    { class: 'pagination', 'aria-label': t('pagination.label') },
    button(t('action.previous'), {
      iconName: 'chevronLeft',
      size: 'sm',
      disabled: response.page <= 1,
      onClick: () => onChange(response.page - 1),
    }),
    el('span', {
      class: 'pagination__status',
      text: t('pagination.page', { page: formatNumber(response.page), pages: formatNumber(pages) }),
    }),
    button(t('action.next'), {
      trailingIconName: 'chevronRight',
      size: 'sm',
      disabled: response.page >= pages,
      onClick: () => onChange(response.page + 1),
    }),
  );
}

/** "Showing 1–20 of 128" line above a list. */
export function resultSummary(response) {
  if (response.total === 0) return el('span', { class: 'result-summary__text', text: t('tasks.showingNone') });
  const from = (response.page - 1) * response.limit + 1;
  const to = Math.min(response.total, from + response.items.length - 1);
  return el('span', {
    class: 'result-summary__text',
    text: t('tasks.showing', {
      from: formatNumber(from),
      to: formatNumber(to),
      total: formatNumber(response.total),
    }),
  });
}

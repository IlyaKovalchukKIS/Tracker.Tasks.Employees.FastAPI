/**
 * Numeric summaries for the dashboard.
 *
 * The visuals stay deliberately plain: a proportion bar communicates a split
 * faster than a chart library, and every value is also written out as text so
 * the information does not depend on colour or on assistive-technology support
 * for graphics.
 */

import { formatNumber } from '../core/i18n.js';
import { el } from './dom.js';
import { icon } from './icons.js';

/**
 * Headline figure with a label and an optional explanatory hint.
 * Passing `href` turns the whole card into a link to the matching filtered list.
 */
export function statCard({ label, value, hint, iconName, tone = 'neutral', href }) {
  const content = [
    el(
      'div',
      { class: 'stat__top' },
      el('span', { class: 'stat__label', text: label }),
      iconName ? el('span', { class: `stat__icon stat__icon--${tone}` }, icon(iconName)) : null,
    ),
    el('p', { class: 'stat__value', text: typeof value === 'number' ? formatNumber(value) : value }),
    hint ? el('p', { class: 'stat__hint', text: hint }) : null,
  ];

  return href
    ? el('a', { class: 'stat stat--link', href }, ...content, el('span', { class: 'stat__arrow' }, icon('arrowRight')))
    : el('div', { class: 'stat' }, ...content);
}

/**
 * Proportion bar with a legend.
 *
 * @param {Array} segments `{ key, label, count, share, tone }`.
 */
export function distributionBar({ segments, emptyLabel }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  const bar = el(
    'div',
    { class: 'distribution__bar', 'aria-hidden': 'true' },
    ...(total === 0
      ? [el('span', { class: 'distribution__segment distribution__segment--empty', style: { width: '100%' } })]
      : segments
          .filter((segment) => segment.count > 0)
          .map((segment) =>
            el('span', {
              class: `distribution__segment distribution__segment--${segment.tone}`,
              style: { width: `${segment.share * 100}%` },
              title: `${segment.label}: ${formatNumber(segment.count)}`,
            }),
          )),
  );

  const legend = el(
    'ul',
    { class: 'distribution__legend' },
    ...segments.map((segment) =>
      el(
        'li',
        { class: 'distribution__legend-item' },
        el('span', { class: `legend-dot legend-dot--${segment.tone}`, 'aria-hidden': 'true' }),
        el('span', { class: 'distribution__legend-label', text: segment.label }),
        el('span', { class: 'distribution__legend-value', text: formatNumber(segment.count) }),
      ),
    ),
  );

  return el(
    'div',
    { class: 'distribution' },
    bar,
    total === 0 && emptyLabel ? el('p', { class: 'distribution__empty', text: emptyLabel }) : null,
    legend,
  );
}

/**
 * Ranked rows with a proportional bar, for comparing a handful of categories.
 *
 * @param {Array} items `{ key, label, count, share, tone }`.
 */
export function barList({ items }) {
  return el(
    'ul',
    { class: 'bar-list' },
    ...items.map((item) =>
      el(
        'li',
        { class: 'bar-list__row' },
        el('span', { class: 'bar-list__label', text: item.label }),
        el(
          'span',
          { class: 'bar-list__track', 'aria-hidden': 'true' },
          el('span', {
            class: `bar-list__fill bar-list__fill--${item.tone}`,
            style: { width: `${Math.max(item.share * 100, item.count > 0 ? 2 : 0)}%` },
          }),
        ),
        el('span', { class: 'bar-list__value', text: formatNumber(item.count) }),
      ),
    ),
  );
}

/** Single figure with a progress track, used for the completion rate. */
export function progressStat({ label, ratio, caption }) {
  const percent = Math.round(ratio * 100);
  return el(
    'div',
    { class: 'progress-stat' },
    el(
      'div',
      { class: 'progress-stat__head' },
      el('span', { class: 'progress-stat__label', text: label }),
      el('span', { class: 'progress-stat__value', text: `${percent}%` }),
    ),
    el(
      'div',
      {
        class: 'progress-stat__track',
        role: 'progressbar',
        'aria-valuenow': String(percent),
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-label': label,
      },
      el('span', { class: 'progress-stat__fill', style: { width: `${percent}%` } }),
    ),
    caption ? el('p', { class: 'progress-stat__caption', text: caption }) : null,
  );
}

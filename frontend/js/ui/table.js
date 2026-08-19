/**
 * Data table used on the wider layouts.
 *
 * Columns describe both the header and how a row renders, so sorting, alignment
 * and responsive column hiding stay in one declaration.
 */

import { t } from '../core/i18n.js';
import { el } from './dom.js';
import { icon } from './icons.js';

const SORT_STATE = { asc: 'ascending', desc: 'descending' };

function headerCell(column, { sort, onSort }) {
  const classes = ['table__head-cell'];
  if (column.align === 'end') classes.push('table__cell--end');
  if (column.hideBelow) classes.push(`table__cell--hide-${column.hideBelow}`);

  const active = sort && column.sortField && sort.field === column.sortField;
  const cell = el('th', {
    scope: 'col',
    class: classes.join(' '),
    style: column.width ? { width: column.width } : null,
    'aria-sort': active ? SORT_STATE[sort.direction] : column.sortField ? 'none' : null,
  });

  if (!column.sortField || !onSort) {
    cell.append(el('span', { text: column.header }));
    return cell;
  }

  cell.append(
    el(
      'button',
      {
        type: 'button',
        class: `table__sort${active ? ' table__sort--active' : ''}`,
        onClick: () => onSort(column.sortField),
      },
      el('span', { text: column.header }),
      icon(active && sort.direction === 'asc' ? 'chevronUp' : 'chevronDown'),
    ),
  );
  return cell;
}

/**
 * @param {object} options
 * @param {Array} options.columns `{ key, header, cell(row), align, width,
 *   sortField, hideBelow }`.
 * @param {Array} options.rows
 * @param {string} options.caption Describes the table for screen readers.
 * @param {{field: string, direction: 'asc'|'desc'}} [options.sort]
 * @param {(field: string) => void} [options.onSort]
 */
export function dataTable({ columns, rows, caption, sort, onSort, rowKey }) {
  const body = el(
    'tbody',
    {},
    ...rows.map((row) =>
      el(
        'tr',
        { dataset: rowKey ? { rowKey: String(rowKey(row)) } : null },
        ...columns.map((column) => {
          const classes = ['table__cell'];
          if (column.align === 'end') classes.push('table__cell--end');
          if (column.hideBelow) classes.push(`table__cell--hide-${column.hideBelow}`);
          const content = column.cell(row);
          return el('td', { class: classes.join(' ') }, content);
        }),
      ),
    ),
  );

  return el(
    'div',
    { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': caption },
    el(
      'table',
      { class: 'table' },
      el('caption', { class: 'visually-hidden', text: caption }),
      el('thead', {}, el('tr', {}, ...columns.map((column) => headerCell(column, { sort, onSort })))),
      body,
    ),
  );
}

/** Right-aligned group of row actions. */
export const rowActions = (...actions) => el('div', { class: 'row-actions' }, ...actions.filter(Boolean));

/** Column definition for the trailing actions column. */
export const actionsColumn = (cell) => ({
  key: 'actions',
  header: t('table.actions'),
  align: 'end',
  width: '1%',
  cell,
});

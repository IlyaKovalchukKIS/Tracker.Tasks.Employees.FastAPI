/**
 * Task list: search, filters, sorting, and pagination over `GET /tasks`.
 *
 * Wide layouts get a sortable table, narrow ones get cards, and the filter
 * state lives in the address bar so a view can be shared or bookmarked.
 */

import { tasks as tasksApi } from '../../core/api.js';
import { labelFor, loadDirectory, resolveUsers } from '../../core/directory.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../core/domain.js';
import { formatDate, formatNumber, t, taskPriorityLabel, taskStatusLabel } from '../../core/i18n.js';
import { canCreateTask, canDeleteTask, canEditTask, canViewDirectory } from '../../core/permissions.js';
import { replaceQuery } from '../../core/router.js';
import { getUser } from '../../core/session.js';
import {
  activeFilters,
  clearFilters,
  hasActiveFilters,
  parseFilters,
  parseSort,
  serializeFilters,
  toRequestParams,
  toggleSort,
  withoutFilter,
} from '../../core/task-filters.js';
import { debounce, el, renderInto, watchMediaFor } from '../../ui/dom.js';
import { toast } from '../../ui/feedback.js';
import { filterField, searchField, select, setOptions } from '../../ui/forms.js';
import { icon } from '../../ui/icons.js';
import { pagination, resultSummary } from '../../ui/pagination.js';
import { button, deadlineMeta, monospace, pageHeader, personLink, priorityBadge } from '../../ui/primitives.js';
import { emptyState, errorState, skeletonCards, skeletonRows } from '../../ui/states.js';
import { actionsColumn, dataTable, rowActions } from '../../ui/table.js';
import { openTaskForm } from './form.js';
import { confirmDeleteTask, statusCell, taskCard } from './parts.js';

// Below this width the seven task columns would scroll sideways, so phones and
// tablets get cards instead.
const TABLE_QUERY = '(min-width: 1200px)';
const UNASSIGNED = 'unassigned';

const SORT_OPTIONS = [
  { value: '-created_at', labelKey: 'tasks.sort.newest' },
  { value: 'created_at', labelKey: 'tasks.sort.oldest' },
  { value: 'deadline', labelKey: 'tasks.sort.deadline' },
  { value: '-priority', labelKey: 'tasks.sort.priority' },
  { value: '-updated_at', labelKey: 'tasks.sort.updated' },
  { value: 'title', labelKey: 'tasks.sort.title' },
];

/** Human-readable description of one active filter, for the removable chips. */
function filterChipLabel({ key, value }) {
  const labels = {
    search: () => t('tasks.chip.search', { value }),
    status: () => t('tasks.chip.status', { value: taskStatusLabel(value) }),
    priority: () => t('tasks.chip.priority', { value: taskPriorityLabel(value) }),
    employeeId: () => t('tasks.chip.assignee', { value: labelFor(Number(value)) ?? `#${value}` }),
    unassigned: () => t('tasks.chip.unassigned'),
  };
  return labels[key]();
}

export function renderTaskList({ query }) {
  const user = getUser();
  const canCreate = canCreateTask(user);
  const canEdit = canEditTask(user);
  // Employees only ever see their own tasks, so the assignee is always
  // themselves: filtering by it, or repeating it on every row, adds nothing.
  const showAssignee = canViewDirectory(user);

  let filters = parseFilters(query);
  let lastResponse = null;
  let useTable = false;
  let loadToken = 0;

  /* ---- Hosts ---- */

  const chipRow = el('div', { class: 'status-chips' });
  const activeChipRow = el('div', { class: 'active-filters' });
  const summaryHost = el('div', { class: 'result-summary' });
  const listHost = el('div', { class: 'task-results' });

  /* ---- Filter controls ---- */

  const search = searchField({
    label: t('tasks.filter.search'),
    value: filters.search,
    placeholder: t('tasks.filter.searchPlaceholder'),
    maxlength: 100,
  });

  search.control.addEventListener(
    'input',
    debounce(() => {
      update({ search: search.control.value }, { counts: true });
    }, 350),
  );

  const prioritySelect = select({
    options: [
      { value: '', label: t('tasks.filter.anyPriority') },
      ...TASK_PRIORITIES.map((value) => ({ value, label: taskPriorityLabel(value) })),
    ],
    value: filters.priority,
    onChange: () => update({ priority: prioritySelect.value }, { counts: true }),
  });

  const assigneeSelect = select({
    options: [{ value: '', label: t('tasks.filter.anyAssignee') }],
    value: filters.employeeId,
    onChange: () => {
      const value = assigneeSelect.value;
      update({ employeeId: value === UNASSIGNED ? '' : value, unassigned: value === UNASSIGNED }, { counts: true });
    },
  });

  const sortSelect = select({
    options: SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    value: filters.sort,
    onChange: () => update({ sort: sortSelect.value }),
  });

  const resetButton = button(t('tasks.filter.clear'), {
    variant: 'ghost',
    size: 'sm',
    iconName: 'slash',
    onClick: () => replaceFilters(clearFilters(filters)),
  });

  const toolbar = el(
    'div',
    { class: 'toolbar', role: 'search', 'aria-label': t('tasks.filters') },
    el('div', { class: 'toolbar__search' }, search.node),
    el(
      'div',
      { class: 'toolbar__filters' },
      filterField({ label: t('tasks.filter.priority'), control: prioritySelect }),
      showAssignee ? filterField({ label: t('tasks.filter.assignee'), control: assigneeSelect }) : null,
      filterField({ label: t('tasks.filter.sort'), control: sortSelect }),
    ),
  );

  if (showAssignee) {
    loadDirectory().then((people) => {
      setOptions(
        assigneeSelect,
        [
          { value: '', label: t('tasks.filter.anyAssignee') },
          { value: UNASSIGNED, label: t('task.unassigned') },
          ...people.map((person) => ({ value: person.id, label: person.email })),
        ],
        filters.unassigned ? UNASSIGNED : filters.employeeId,
      );
    });
  }

  /* ---- State transitions ---- */

  /** Apply a partial change, returning to the first page. */
  function update(patch, { counts = false } = {}) {
    replaceFilters({ ...filters, ...patch, page: 1 }, { counts });
  }

  function replaceFilters(next, { counts = true } = {}) {
    filters = next;
    syncControls();
    replaceQuery('/tasks', serializeFilters(filters));
    load();
    if (counts) loadCounts();
    renderActiveChips();
  }

  function goToPage(page) {
    filters = { ...filters, page };
    replaceQuery('/tasks', serializeFilters(filters));
    load();
    document.getElementById('main')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /** Keep the controls in step with state changed elsewhere, such as a chip. */
  function syncControls() {
    if (search.control.value !== filters.search) search.control.value = filters.search;
    search.syncClear();
    prioritySelect.value = filters.priority;
    sortSelect.value = filters.sort;
    if (showAssignee) assigneeSelect.value = filters.unassigned ? UNASSIGNED : filters.employeeId;
  }

  /* ---- Status chips with counts ---- */

  function renderChips(counts) {
    const total = counts ? TASK_STATUSES.reduce((sum, status) => sum + counts[status], 0) : null;
    const entries = [
      { value: '', label: t('tasks.stat.all'), count: total },
      ...TASK_STATUSES.map((status) => ({ value: status, label: taskStatusLabel(status), count: counts?.[status] })),
    ];

    renderInto(
      chipRow,
      ...entries.map((entry) =>
        el(
          'button',
          {
            type: 'button',
            class: 'chip',
            'aria-pressed': String(filters.status === entry.value),
            onClick: () => update({ status: entry.value }, { counts: false }),
          },
          el('span', { text: entry.label }),
          entry.count === null || entry.count === undefined
            ? el('span', { class: 'chip__count chip__count--loading', 'aria-hidden': 'true' })
            : el('span', { class: 'chip__count', text: formatNumber(entry.count) }),
        ),
      ),
    );
  }

  async function loadCounts() {
    renderChips(null);
    const base = { ...toRequestParams(filters), page: 1, limit: 1, status: null };
    try {
      const totals = await Promise.all(TASK_STATUSES.map((status) => tasksApi.count({ ...base, status })));
      renderChips(Object.fromEntries(TASK_STATUSES.map((status, index) => [status, totals[index]])));
    } catch {
      // Counts are supplementary; the list itself reports any real failure.
      renderChips(null);
    }
  }

  /* ---- Active filter chips ---- */

  function renderActiveChips() {
    const active = activeFilters(filters);
    if (active.length === 0) {
      renderInto(activeChipRow);
      activeChipRow.hidden = true;
      return;
    }

    activeChipRow.hidden = false;
    renderInto(
      activeChipRow,
      el('span', { class: 'active-filters__label', text: t('tasks.activeFilters') }),
      ...active.map((entry) =>
        el(
          'button',
          {
            type: 'button',
            class: 'filter-chip',
            'aria-label': t('tasks.removeFilter', { filter: filterChipLabel(entry) }),
            onClick: () => replaceFilters(withoutFilter(filters, entry.key)),
          },
          el('span', { text: filterChipLabel(entry) }),
          icon('x'),
        ),
      ),
      resetButton,
    );
  }

  /* ---- Rows ---- */

  function taskActions(task) {
    return rowActions(
      canEdit
        ? button('', {
            variant: 'ghost',
            size: 'sm',
            iconName: 'pencil',
            'aria-label': t('task.editLabel', { title: task.title }),
            title: t('action.edit'),
            onClick: () => openTaskForm({ task, onSaved: () => refresh() }),
          })
        : null,
      canDeleteTask(user, task)
        ? button('', {
            variant: 'ghost',
            size: 'sm',
            iconName: 'trash',
            class: 'btn--danger-ghost',
            'aria-label': t('task.deleteLabel', { title: task.title }),
            title: t('action.delete'),
            onClick: async () => {
              try {
                if (await confirmDeleteTask(task)) refresh();
              } catch (error) {
                toast(error.message, 'error');
              }
            },
          })
        : null,
    );
  }

  function tableView(response) {
    const sort = parseSort(filters.sort);
    return dataTable({
      caption: t('tasks.tableCaption'),
      sort,
      onSort: (fieldName) => update({ sort: toggleSort(filters.sort, fieldName) }, { counts: false }),
      rowKey: (task) => task.id,
      rows: response.items,
      columns: [
        {
          key: 'title',
          header: t('task.field.title'),
          sortField: 'title',
          cell: (task) =>
            el(
              'div',
              { class: 'cell-task' },
              el('a', { class: 'cell-task__title', href: `#/tasks/${task.id}`, text: task.title }),
              el('span', { class: 'cell-task__id' }, monospace(`#${task.id}`)),
            ),
        },
        {
          key: 'status',
          header: t('task.field.status'),
          sortField: 'status',
          width: '160px',
          cell: (task) => statusCell(task, onTaskChanged),
        },
        {
          key: 'priority',
          header: t('task.field.priority'),
          sortField: 'priority',
          width: '120px',
          cell: (task) => priorityBadge(task.priority),
        },
        ...(showAssignee
          ? [
              {
                key: 'assignee',
                header: t('task.field.assignee'),
                hideBelow: 'lg',
                cell: (task) => personLink(task.executor_id),
              },
            ]
          : []),
        {
          key: 'deadline',
          header: t('task.field.deadline'),
          sortField: 'deadline',
          cell: (task) => deadlineMeta(task.deadline, task.status, { compact: true }),
        },
        {
          key: 'created',
          header: t('task.field.created'),
          sortField: 'created_at',
          hideBelow: 'xl',
          cell: (task) => el('span', { class: 'cell-muted', text: formatDate(task.created_at) }),
        },
        actionsColumn((task) => taskActions(task)),
      ],
    });
  }

  const cardView = (response) =>
    el(
      'div',
      { class: 'card-list' },
      ...response.items.map((task) =>
        taskCard(task, { actions: taskActions(task), onStatusChanged: onTaskChanged, showAssignee }),
      ),
    );

  function emptyView() {
    return hasActiveFilters(filters)
      ? emptyState({
          iconName: 'search',
          title: t('tasks.emptyFiltered.title'),
          description: t('tasks.emptyFiltered.description'),
          action: button(t('tasks.filter.clear'), {
            variant: 'primary',
            iconName: 'slash',
            onClick: () => replaceFilters(clearFilters(filters)),
          }),
        })
      : emptyState({
          iconName: 'clipboard',
          title: t('tasks.empty.title'),
          description: canCreate ? t('tasks.empty.description.manager') : t('tasks.empty.description.employee'),
          action: canCreate
            ? button(t('tasks.new'), { variant: 'primary', iconName: 'plus', onClick: () => openCreateForm() })
            : null,
        });
  }

  function paint() {
    if (!lastResponse) return;
    renderInto(summaryHost, resultSummary(lastResponse));

    if (lastResponse.items.length === 0) {
      renderInto(listHost, emptyView());
      return;
    }

    renderInto(
      listHost,
      useTable ? tableView(lastResponse) : cardView(lastResponse),
      pagination({ response: lastResponse, onChange: goToPage }),
    );
  }

  /* ---- Data ---- */

  function onTaskChanged() {
    // A status change can move a task out of the current filter, so reload.
    refresh();
  }

  function refresh() {
    load();
    loadCounts();
  }

  async function load() {
    const token = (loadToken += 1);
    renderInto(summaryHost);
    renderInto(listHost, useTable ? skeletonRows() : skeletonCards());

    try {
      const response = await tasksApi.list(toRequestParams(filters));
      if (token !== loadToken) return;
      await resolveUsers(response.items.map((task) => task.executor_id));
      if (token !== loadToken) return;
      lastResponse = response;
      paint();
    } catch (error) {
      if (token !== loadToken) return;
      lastResponse = null;
      renderInto(summaryHost);
      renderInto(listHost, errorState({ error, onRetry: refresh }));
    }
  }

  const openCreateForm = () => openTaskForm({ onSaved: () => refresh() });

  /* ---- Page ---- */

  const page = el(
    'div',
    {},
    pageHeader({
      title: t('tasks.title'),
      description: canCreate ? t('tasks.subtitle.manager') : t('tasks.subtitle.employee'),
      actions: canCreate
        ? button(t('tasks.new'), { variant: 'primary', iconName: 'plus', onClick: openCreateForm })
        : null,
    }),
    chipRow,
    toolbar,
    activeChipRow,
    summaryHost,
    listHost,
  );

  // Switching between the table and the cards re-renders from the cached
  // response, so resizing the window never refetches.
  watchMediaFor(page, TABLE_QUERY, (matches) => {
    const changed = useTable !== matches;
    useTable = matches;
    if (changed && lastResponse) paint();
  });

  renderActiveChips();
  load();
  loadCounts();

  return page;
}

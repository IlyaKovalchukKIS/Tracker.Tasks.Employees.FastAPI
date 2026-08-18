/**
 * Task list, task detail, and the create / edit form.
 */

import { tasks as tasksApi } from '../api.js';
import { labelFor, loadDirectory, resolveUsers } from '../directory.js';
import { formatDate, formatNumber, parseTimestamp, t, taskStatusLabel } from '../i18n.js';
import { canManageWork, getUser } from '../session.js';
import {
  badge,
  button,
  confirmDialog,
  deadlineMeta,
  el,
  emptyState,
  errorState,
  field,
  formError,
  fragment,
  icon,
  input,
  meta,
  openModal,
  priorityBadge,
  renderInto,
  select,
  setButtonLoading,
  setFieldErrors,
  skeletonList,
  statusBadge,
  textarea,
  toast,
  debounce,
} from '../ui.js';
import { compact, validateRequired, MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '../validate.js';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const PAGE_SIZE = 20;
const DEFAULT_SORT = '-created_at';

const SORT_OPTIONS = [
  { value: '-created_at', labelKey: 'tasks.sort.newest' },
  { value: 'created_at', labelKey: 'tasks.sort.oldest' },
  { value: 'deadline', labelKey: 'tasks.sort.deadline' },
  { value: '-updated_at', labelKey: 'tasks.sort.updated' },
  { value: 'title', labelKey: 'tasks.sort.title' },
];

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

function canDeleteTask(task) {
  const user = getUser();
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'MANAGER' && task.owner_id === user.id;
}

function canChangeStatus(task) {
  const user = getUser();
  if (!user) return false;
  return canManageWork() || task.executor_id === user.id;
}

/* ------------------------------------------------------------------ */
/* Date conversion between ISO and <input type="datetime-local">        */
/* ------------------------------------------------------------------ */

function toLocalInputValue(iso) {
  const date = parseTimestamp(iso);
  if (!date) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* ------------------------------------------------------------------ */
/* Create / edit form                                                  */
/* ------------------------------------------------------------------ */

/**
 * Open the task editor. `task` omitted means "create".
 * `onSaved` receives the saved task so the caller can refresh its own view.
 */
export async function openTaskForm({ task = null, onSaved } = {}) {
  const isEdit = Boolean(task);
  const people = await loadDirectory();

  const titleInput = input({
    type: 'text',
    value: task?.title ?? '',
    maxlength: MAX_TITLE_LENGTH,
    placeholder: t('task.titlePlaceholder'),
    autofocus: true,
  });
  const descriptionInput = textarea({
    value: task?.description ?? '',
    maxlength: MAX_DESCRIPTION_LENGTH,
    placeholder: t('task.descriptionPlaceholder'),
  });
  const statusSelect = select({
    options: TASK_STATUSES.map((value) => ({ value, label: taskStatusLabel(value) })),
    value: task?.status ?? 'TODO',
  });
  const prioritySelect = select({
    options: TASK_PRIORITIES.map((value) => ({ value, label: t(`task.priority.${value}`) })),
    value: task?.priority ?? 'MEDIUM',
  });
  const deadlineInput = input({ type: 'datetime-local', value: toLocalInputValue(task?.deadline) });
  const executorSelect = select({
    options: [
      { value: '', label: t('task.unassigned') },
      ...people.map((person) => ({ value: person.id, label: person.email })),
    ],
    value: task?.executor_id ?? '',
  });
  const parentInput = input({
    type: 'number',
    min: '1',
    step: '1',
    value: task?.parent_id ?? '',
    placeholder: t('task.parentPlaceholder'),
  });

  const banner = formError();
  const form = el(
    'form',
    { class: 'form', id: 'task-form', novalidate: true, onSubmit: onSubmit },
    banner,
    field({ name: 'title', label: t('task.field.title'), control: titleInput, required: true }),
    field({ name: 'description', label: t('task.field.description'), control: descriptionInput, required: true }),
    el(
      'div',
      { class: 'form-grid' },
      field({ name: 'status', label: t('task.field.status'), control: statusSelect }),
      field({ name: 'priority', label: t('task.field.priority'), control: prioritySelect }),
      field({ name: 'deadline', label: t('task.field.deadline'), control: deadlineInput }),
      field({ name: 'executor_id', label: t('task.field.assignee'), control: executorSelect }),
    ),
    field({ name: 'parent_id', label: t('task.field.parent'), control: parentInput }),
  );

  const submit = button(isEdit ? t('action.saveChanges') : t('action.create'), {
    variant: 'primary',
    type: 'submit',
    form: 'task-form',
  });

  const modal = openModal({
    title: isEdit ? t('task.form.edit') : t('task.form.create'),
    body: form,
    footer: fragment(button(t('action.cancel'), { onClick: () => modal.close() }), submit),
  });

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);

    const errors = compact({
      title: validateRequired(titleInput.value, { max: MAX_TITLE_LENGTH }),
      description: validateRequired(descriptionInput.value, { max: MAX_DESCRIPTION_LENGTH }),
      parent_id: parentInput.value && !Number.isInteger(Number(parentInput.value)) ? t('validation.notANumber') : null,
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const payload = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      status: statusSelect.value,
      priority: prioritySelect.value,
      deadline: fromLocalInputValue(deadlineInput.value),
      executor_id: executorSelect.value ? Number(executorSelect.value) : null,
      parent_id: parentInput.value ? Number(parentInput.value) : null,
    };

    setButtonLoading(submit, true);
    try {
      const saved = isEdit ? await tasksApi.update(task.id, payload) : await tasksApi.create(payload);
      modal.close();
      toast(t(isEdit ? 'task.updated' : 'task.created', { title: saved.title }), 'success');
      onSaved?.(saved);
    } catch (error) {
      banner.setMessage(error.message);
      setFieldErrors(form, error.fieldErrors ?? {});
    } finally {
      setButtonLoading(submit, false);
    }
  }
}

async function confirmDeleteTask(task) {
  const confirmed = await confirmDialog({
    title: t('task.delete.title'),
    message: t('task.delete.message', { title: task.title }),
    confirmLabel: t('action.delete'),
    danger: true,
  });
  if (!confirmed) return false;
  await tasksApi.remove(task.id);
  toast(t('task.deleted'), 'success');
  return true;
}

/** Inline status dropdown shared by the list rows and the detail page. */
function statusControl(task, onChanged) {
  const control = select({
    options: TASK_STATUSES.map((value) => ({ value, label: taskStatusLabel(value) })),
    value: task.status,
    'aria-label': t('task.statusChangeLabel', { title: task.title }),
  });

  control.addEventListener('change', async () => {
    const nextStatus = control.value;
    control.disabled = true;
    try {
      const updated = await tasksApi.update(task.id, { status: nextStatus });
      toast(t('task.statusUpdated', { status: taskStatusLabel(updated.status) }), 'success');
      onChanged?.(updated);
    } catch (error) {
      control.value = task.status;
      toast(error.message, 'error');
    } finally {
      control.disabled = false;
    }
  });

  return control;
}

/* ------------------------------------------------------------------ */
/* Task list                                                           */
/* ------------------------------------------------------------------ */

export function renderTaskList({ query }) {
  const state = {
    page: Math.max(1, Number(query.get('page')) || 1),
    status: TASK_STATUSES.includes(query.get('status')) ? query.get('status') : '',
    priority: TASK_PRIORITIES.includes(query.get('priority')) ? query.get('priority') : '',
    employeeId: query.get('employee_id') ?? '',
    unassigned: query.get('unassigned') === 'true',
    search: query.get('search') ?? '',
    sort: SORT_OPTIONS.some((option) => option.value === query.get('sort')) ? query.get('sort') : DEFAULT_SORT,
  };

  const hasFilters = () =>
    Boolean(state.status || state.priority || state.employeeId || state.unassigned || state.search);

  function requestParams() {
    return {
      page: state.page,
      limit: PAGE_SIZE,
      status: state.status || null,
      priority: state.priority || null,
      employee_id: state.employeeId || null,
      unassigned: state.unassigned ? 'true' : null,
      search: state.search.trim() || null,
      sort: state.sort,
    };
  }

  /** Keep the address bar shareable without triggering a route change. */
  function syncAddressBar() {
    const params = new URLSearchParams();
    if (state.page > 1) params.set('page', state.page);
    if (state.status) params.set('status', state.status);
    if (state.priority) params.set('priority', state.priority);
    if (state.employeeId) params.set('employee_id', state.employeeId);
    if (state.unassigned) params.set('unassigned', 'true');
    if (state.search.trim()) params.set('search', state.search.trim());
    if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
    const search = params.toString();
    history.replaceState(null, '', search ? `#/tasks?${search}` : '#/tasks');
  }

  /* ---- Filter controls ---- */

  const searchInput = input({
    type: 'search',
    value: state.search,
    placeholder: t('tasks.filter.searchPlaceholder'),
    'aria-label': t('tasks.filter.search'),
  });
  searchInput.addEventListener(
    'input',
    debounce(() => {
      state.search = searchInput.value;
      state.page = 1;
      reload();
    }, 350),
  );

  const statusSelect = select({
    options: [
      { value: '', label: t('tasks.filter.anyStatus') },
      ...TASK_STATUSES.map((value) => ({ value, label: taskStatusLabel(value) })),
    ],
    value: state.status,
    'aria-label': t('tasks.filter.status'),
    onChange: () => {
      state.status = statusSelect.value;
      state.page = 1;
      reload();
    },
  });

  const prioritySelect = select({
    options: [
      { value: '', label: t('tasks.filter.anyPriority') },
      ...TASK_PRIORITIES.map((value) => ({ value, label: t(`task.priority.${value}`) })),
    ],
    value: state.priority,
    'aria-label': t('tasks.filter.priority'),
    onChange: () => {
      state.priority = prioritySelect.value;
      state.page = 1;
      reload();
    },
  });

  const assigneeSelect = select({
    options: [{ value: '', label: t('tasks.filter.anyAssignee') }],
    value: state.employeeId,
    'aria-label': t('tasks.filter.assignee'),
    onChange: () => {
      state.employeeId = assigneeSelect.value;
      state.unassigned = false;
      state.page = 1;
      reload();
    },
  });

  const sortSelect = select({
    options: SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    value: state.sort,
    'aria-label': t('tasks.filter.sort'),
    onChange: () => {
      state.sort = sortSelect.value;
      state.page = 1;
      reload();
    },
  });

  const unassignedToggle = el('input', {
    type: 'checkbox',
    checked: state.unassigned,
    onChange: () => {
      state.unassigned = unassignedToggle.checked;
      if (state.unassigned) {
        state.employeeId = '';
        assigneeSelect.value = '';
      }
      state.page = 1;
      reload();
    },
  });

  const clearButton = button(t('tasks.filter.clear'), {
    variant: 'ghost',
    size: 'sm',
    iconName: 'slash',
    onClick: () => {
      Object.assign(state, { status: '', priority: '', employeeId: '', unassigned: false, search: '', page: 1 });
      searchInput.value = '';
      statusSelect.value = '';
      prioritySelect.value = '';
      assigneeSelect.value = '';
      unassignedToggle.checked = false;
      reload();
    },
  });

  const toolbar = el(
    'div',
    { class: 'toolbar', role: 'search', 'aria-label': t('tasks.filters') },
    el(
      'div',
      { class: 'toolbar__row' },
      el('div', { class: 'toolbar__search' }, el('span', { class: 'search-input' }, icon('search'), searchInput)),
      el('div', { class: 'toolbar__field' }, statusSelect),
      el('div', { class: 'toolbar__field' }, prioritySelect),
      canManageWork() ? el('div', { class: 'toolbar__field' }, assigneeSelect) : null,
      el('div', { class: 'toolbar__field' }, sortSelect),
    ),
    el(
      'div',
      { class: 'toolbar__row' },
      canManageWork()
        ? el('label', { class: 'checkbox' }, unassignedToggle, el('span', { text: t('tasks.filter.unassignedOnly') }))
        : null,
      clearButton,
    ),
  );

  if (canManageWork()) {
    loadDirectory().then((people) => {
      if (people.length === 0) return;
      renderInto(
        assigneeSelect,
        ...[{ value: '', label: t('tasks.filter.anyAssignee') }, ...people.map((p) => ({ value: p.id, label: p.email }))].map(
          (option) =>
            el('option', {
              value: option.value,
              text: option.label,
              selected: String(option.value) === String(state.employeeId),
            }),
        ),
      );
    });
  }

  /* ---- Status count chips ---- */

  const chipRow = el('div', { class: 'filter-chips filter-chips--section' });

  function renderChips(counts) {
    const total = counts ? TASK_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0) : null;
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
            'aria-pressed': String(state.status === entry.value),
            onClick: () => {
              state.status = entry.value;
              state.page = 1;
              statusSelect.value = entry.value;
              reload();
            },
          },
          el('span', { text: entry.label }),
          entry.count === null || entry.count === undefined
            ? null
            : el('span', { class: 'chip__count', text: formatNumber(entry.count) }),
        ),
      ),
    );
  }

  async function refreshChips() {
    renderChips(null);
    try {
      const base = { ...requestParams(), limit: 1, page: 1, status: null };
      const responses = await Promise.all(
        TASK_STATUSES.map((status) => tasksApi.list({ ...base, status })),
      );
      const counts = {};
      TASK_STATUSES.forEach((status, index) => {
        counts[status] = responses[index].total;
      });
      renderChips(counts);
    } catch {
      renderChips(null);
    }
  }

  /* ---- Results ---- */

  const summary = el('div', { class: 'result-summary' });
  const listHost = el('div', {});

  function taskRow(task) {
    const row = el('article', { class: 'item' });

    function replaceWith(updated) {
      row.replaceWith(taskRow(updated));
    }

    const actions = [
      canChangeStatus(task)
        ? statusControl(task, (updated) => {
            refreshChips();
            if (state.status) reload();
            else replaceWith(updated);
          })
        : statusBadge(task.status),
      canManageWork()
        ? button('', {
            variant: 'ghost',
            iconName: 'pencil',
            size: 'sm',
            'aria-label': `${t('action.edit')}: ${task.title}`,
            onClick: () => openTaskForm({ task, onSaved: () => reload() }),
          })
        : null,
      canDeleteTask(task)
        ? button('', {
            variant: 'ghost',
            iconName: 'trash',
            size: 'sm',
            'aria-label': `${t('action.delete')}: ${task.title}`,
            onClick: async () => {
              try {
                if (await confirmDeleteTask(task)) reload();
              } catch (error) {
                toast(error.message, 'error');
              }
            },
          })
        : null,
    ];

    row.append(
      el(
        'div',
        { class: 'item__main' },
        el('a', { class: 'item__title', href: `#/tasks/${task.id}`, text: task.title }),
        el('p', { class: 'item__excerpt', text: task.description }),
        el(
          'div',
          { class: 'item__meta' },
          el('span', { class: 'mono', text: `#${task.id}` }),
          priorityBadge(task.priority),
          deadlineMeta(task.deadline, task.status),
          meta('user', labelFor(task.executor_id) ?? t('task.unassigned')),
          task.parent_id ? meta('link', t('task.subtaskHint', { id: task.parent_id })) : null,
        ),
      ),
      el('div', { class: 'item__side' }, ...actions.filter(Boolean)),
    );

    return row;
  }

  function pagination(response) {
    const pages = Math.max(1, Math.ceil(response.total / response.limit));
    if (pages <= 1) return null;

    const goTo = (page) => {
      state.page = page;
      reload();
      document.getElementById('main')?.scrollIntoView({ block: 'start' });
    };

    return el(
      'nav',
      { class: 'pagination', 'aria-label': t('tasks.title') },
      button(t('action.previous'), {
        iconName: 'chevronLeft',
        size: 'sm',
        disabled: response.page <= 1,
        onClick: () => goTo(response.page - 1),
      }),
      el('span', { class: 'pagination__status', text: t('pagination.page', { page: response.page, pages }) }),
      button(t('action.next'), {
        iconName: 'chevronRight',
        size: 'sm',
        disabled: response.page >= pages,
        onClick: () => goTo(response.page + 1),
      }),
    );
  }

  function results(response) {
    if (response.items.length === 0) {
      return hasFilters()
        ? emptyState({
            iconName: 'search',
            title: t('tasks.emptyFiltered.title'),
            description: t('tasks.emptyFiltered.description'),
            action: button(t('tasks.filter.clear'), { onClick: () => clearButton.click() }),
          })
        : emptyState({
            iconName: 'clipboard',
            title: t('tasks.empty.title'),
            description: canManageWork()
              ? t('tasks.empty.description.manager')
              : t('tasks.empty.description.employee'),
            action: canManageWork()
              ? button(t('tasks.new'), {
                  variant: 'primary',
                  iconName: 'plus',
                  onClick: () => openTaskForm({ onSaved: () => reload() }),
                })
              : null,
          });
    }

    return fragment(
      el('div', { class: 'item-list' }, ...response.items.map(taskRow)),
      pagination(response),
    );
  }

  function updateSummary(response) {
    if (response.total === 0) {
      renderInto(summary, el('span', { text: t('tasks.showingNone') }));
      return;
    }
    const from = (response.page - 1) * response.limit + 1;
    const to = Math.min(response.total, from + response.items.length - 1);
    renderInto(
      summary,
      el('span', {
        text: t('tasks.showing', {
          from: formatNumber(from),
          to: formatNumber(to),
          total: formatNumber(response.total),
        }),
      }),
    );
  }

  let loadToken = 0;

  async function load() {
    const token = (loadToken += 1);
    renderInto(listHost, skeletonList());
    try {
      const response = await tasksApi.list(requestParams());
      if (token !== loadToken) return;
      await resolveUsers(response.items.map((task) => task.executor_id));
      if (token !== loadToken) return;
      updateSummary(response);
      renderInto(listHost, results(response));
    } catch (error) {
      if (token !== loadToken) return;
      renderInto(summary);
      renderInto(listHost, errorState({ message: error.message, onRetry: reload }));
    }
  }

  function reload() {
    syncAddressBar();
    load();
    refreshChips();
  }

  /* ---- Page ---- */

  const page = el(
    'div',
    {},
    el(
      'div',
      { class: 'page-header' },
      el(
        'div',
        { class: 'page-header__text' },
        el('h1', { text: t('tasks.title') }),
        el('p', {
          class: 'page-header__subtitle',
          text: canManageWork() ? t('tasks.subtitle.manager') : t('tasks.subtitle.employee'),
        }),
      ),
      canManageWork()
        ? el(
            'div',
            { class: 'page-actions' },
            button(t('tasks.new'), {
              variant: 'primary',
              iconName: 'plus',
              onClick: () => openTaskForm({ onSaved: () => reload() }),
            }),
          )
        : null,
    ),
    chipRow,
    toolbar,
    summary,
    listHost,
  );

  reload();
  return page;
}

/* ------------------------------------------------------------------ */
/* Task detail                                                         */
/* ------------------------------------------------------------------ */

export async function renderTaskDetail({ params, navigate }) {
  let task;
  try {
    task = await tasksApi.get(params.id);
  } catch (error) {
    return emptyState({
      iconName: error.status === 404 ? 'search' : 'alert',
      title: t('error.title'),
      description: error.status === 404 ? t('error.taskMissing') : error.message,
      action: button(t('action.backToTasks'), { iconName: 'arrowLeft', onClick: () => navigate('#/tasks') }),
    });
  }

  // Employees may not read other users, so resolving the creator would only
  // produce a rejected request; the id is shown instead.
  await resolveUsers(canManageWork() ? [task.executor_id, task.owner_id] : [task.executor_id]);

  const host = el('div', {});

  function paint(current) {
    const actions = el(
      'div',
      { class: 'page-actions' },
      canChangeStatus(current) ? statusControl(current, (updated) => paint(updated)) : null,
      canManageWork()
        ? button(t('action.edit'), {
            iconName: 'pencil',
            onClick: () => openTaskForm({ task: current, onSaved: (updated) => paint(updated) }),
          })
        : null,
      canDeleteTask(current)
        ? button(t('action.delete'), {
            variant: 'danger',
            iconName: 'trash',
            onClick: async () => {
              try {
                if (await confirmDeleteTask(current)) navigate('#/tasks');
              } catch (error) {
                toast(error.message, 'error');
              }
            },
          })
        : null,
    );

    renderInto(
      host,
      el(
        'p',
        { class: 'breadcrumb' },
        el('a', { href: '#/tasks', text: t('action.backToTasks') }),
      ),
      el(
        'div',
        { class: 'page-header' },
        el(
          'div',
          { class: 'page-header__text' },
          el(
            'div',
            { class: 'row' },
            el('span', { class: 'mono', text: `#${current.id}` }),
            statusBadge(current.status),
            priorityBadge(current.priority),
          ),
          el('h1', { text: current.title }),
        ),
        actions,
      ),
      el(
        'div',
        { class: 'stack' },
        el(
          'section',
          { class: 'card' },
          el('div', { class: 'card__header' }, el('h2', { text: t('task.field.description') })),
          el('div', { class: 'card__body' }, el('p', { class: 'prose', text: current.description })),
        ),
        el(
          'section',
          { class: 'card' },
          el('div', { class: 'card__header' }, el('h2', { text: t('task.detail.title') })),
          el(
            'div',
            { class: 'card__body' },
            el(
              'dl',
              { class: 'detail-list' },
              el('dt', { text: t('task.field.assignee') }),
              el('dd', {}, labelFor(current.executor_id) ?? badge(t('task.unassigned'), 'neutral')),
              el('dt', { text: t('task.field.owner') }),
              el('dd', { text: labelFor(current.owner_id) ?? '—' }),
              el('dt', { text: t('task.field.deadline') }),
              el('dd', {}, deadlineMeta(current.deadline, current.status)),
              el('dt', { text: t('task.field.parent') }),
              el(
                'dd',
                {},
                current.parent_id
                  ? el('a', { href: `#/tasks/${current.parent_id}`, text: `#${current.parent_id}` })
                  : t('task.noParent'),
              ),
              el('dt', { text: t('task.field.created') }),
              el('dd', { text: formatDate(current.created_at, { withTime: true }) }),
              el('dt', { text: t('task.field.updated') }),
              el('dd', { text: formatDate(current.updated_at, { withTime: true }) }),
            ),
          ),
        ),
      ),
    );
  }

  paint(task);
  return host;
}

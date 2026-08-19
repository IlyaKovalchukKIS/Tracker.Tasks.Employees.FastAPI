/**
 * Dashboard: what is happening with the team's work right now.
 *
 * The API has no statistics endpoint, so the figures are assembled from several
 * count-only task queries plus one window of open work ordered by deadline.
 * Everything loads in parallel and each card fills in as the data arrives.
 */

import { tasks as tasksApi } from '../core/api.js';
import { atRiskTasks } from '../core/deadline.js';
import { loadDirectory, resolveUsers } from '../core/directory.js';
import {
  OPEN_STATUSES,
  PRIORITY_TONE,
  STATUS_TONE,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../core/domain.js';
import { formatNumber, formatPercent, t, taskPriorityLabel, taskStatusLabel } from '../core/i18n.js';
import { buildTaskSummary } from '../core/metrics.js';
import { canCreateTask, canViewDirectory } from '../core/permissions.js';
import { getUser } from '../core/session.js';
import { el, renderInto } from '../ui/dom.js';
import { button, card, pageHeader } from '../ui/primitives.js';
import { barList, distributionBar, progressStat, statCard } from '../ui/stats.js';
import { emptyState, errorState, skeletonCards, skeletonStats } from '../ui/states.js';
import { openTaskForm } from './tasks/form.js';
import { taskLines } from './tasks/parts.js';

/** How many open tasks are inspected for deadline pressure. */
const OPEN_WINDOW = 50;
const RECENT_LIMIT = 5;
const ATTENTION_LIMIT = 6;

/** One count query per value of a filter, run in parallel. */
async function countsByFilter(parameter, values) {
  const totals = await Promise.all(values.map((value) => tasksApi.count({ [parameter]: value })));
  return Object.fromEntries(values.map((value, index) => [value, totals[index]]));
}

/**
 * Open tasks ordered by deadline. The API filters by a single status, so the
 * open statuses are fetched separately and merged.
 */
async function fetchOpenWork() {
  const responses = await Promise.all(
    OPEN_STATUSES.map((status) => tasksApi.list({ page: 1, limit: OPEN_WINDOW, sort: 'deadline', status })),
  );
  return {
    items: responses.flatMap((response) => response.items),
    truncated: responses.some((response) => response.total > OPEN_WINDOW),
  };
}

async function fetchOverview(user) {
  const [statusCounts, priorityCounts, recent, openWork, team] = await Promise.all([
    countsByFilter('status', TASK_STATUSES),
    countsByFilter('priority', TASK_PRIORITIES),
    tasksApi.list({ page: 1, limit: RECENT_LIMIT, sort: '-created_at' }),
    fetchOpenWork(),
    canViewDirectory(user)
      ? Promise.all([loadDirectory(), tasksApi.count({ unassigned: 'true' })]).then(([people, unassigned]) => ({
          size: people.length,
          unassigned,
        }))
      : null,
  ]);

  const attention = atRiskTasks(openWork.items);
  await resolveUsers([...recent.items, ...attention.slice(0, ATTENTION_LIMIT)].map((task) => task.executor_id));

  return {
    summary: buildTaskSummary({
      statusCounts,
      priorityCounts,
      openTasks: openWork.items,
      openTasksTruncated: openWork.truncated,
    }),
    recent: recent.items,
    attention,
    team,
  };
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

function statsRow(summary) {
  const overdueHint = summary.deadlineCountsPartial
    ? t('dashboard.stat.overdue.hintPartial', { count: formatNumber(OPEN_WINDOW) })
    : t('dashboard.stat.overdue.hint');

  return el(
    'div',
    { class: 'stat-grid' },
    statCard({
      label: t('dashboard.stat.total'),
      value: summary.total,
      hint: t('dashboard.stat.total.hint'),
      iconName: 'layers',
      tone: 'accent',
      href: '#/tasks',
    }),
    statCard({
      label: t('dashboard.stat.active'),
      value: summary.active,
      hint: t('dashboard.stat.active.hint', { inProgress: formatNumber(summary.inProgress) }),
      iconName: 'activity',
      tone: 'info',
      href: '#/tasks?status=IN_PROGRESS',
    }),
    statCard({
      label: t('dashboard.stat.overdue'),
      value: summary.overdue,
      hint: overdueHint,
      iconName: 'alertTriangle',
      tone: summary.overdue > 0 ? 'danger' : 'neutral',
      href: '#/tasks?sort=deadline',
    }),
    statCard({
      label: t('dashboard.stat.done'),
      value: summary.done,
      hint: t('dashboard.stat.done.hint', { percent: formatPercent(summary.completionRate) }),
      iconName: 'checkCircle',
      tone: 'success',
      href: '#/tasks?status=DONE',
    }),
  );
}

function statusCard(summary) {
  return card(
    { title: t('dashboard.status.title'), description: t('dashboard.status.description') },
    distributionBar({
      emptyLabel: t('dashboard.status.empty'),
      segments: summary.statusDistribution.map((entry) => ({
        ...entry,
        label: taskStatusLabel(entry.key),
        tone: STATUS_TONE[entry.key],
      })),
    }),
    progressStat({
      label: t('dashboard.completionRate'),
      ratio: summary.completionRate,
      caption: t('dashboard.completionRate.caption'),
    }),
  );
}

function priorityCard(summary) {
  return card(
    { title: t('dashboard.priority.title'), description: t('dashboard.priority.description') },
    barList({
      items: summary.priorityDistribution
        .slice()
        .reverse()
        .map((entry) => ({ ...entry, label: taskPriorityLabel(entry.key), tone: PRIORITY_TONE[entry.key] })),
    }),
  );
}

function attentionCard(attention, { canCreate, showAssignee }) {
  const visible = attention.slice(0, ATTENTION_LIMIT);

  return card(
    {
      title: t('dashboard.attention.title'),
      description: t('dashboard.attention.description'),
      actions:
        attention.length > ATTENTION_LIMIT
          ? el('a', { class: 'card__link', href: '#/tasks?sort=deadline', text: t('dashboard.attention.viewAll') })
          : null,
    },
    visible.length === 0
      ? emptyState({
          iconName: 'checkCircle',
          title: t('dashboard.attention.empty.title'),
          description: canCreate
            ? t('dashboard.attention.empty.description.manager')
            : t('dashboard.attention.empty.description.employee'),
          compact: true,
        })
      : taskLines(visible, { showAssignee }),
  );
}

function recentCard(recent, { canCreate, onCreate, showAssignee }) {
  return card(
    {
      title: t('dashboard.recent.title'),
      description: t('dashboard.recent.description'),
      actions: el('a', { class: 'card__link', href: '#/tasks', text: t('dashboard.recent.viewAll') }),
    },
    recent.length === 0
      ? emptyState({
          iconName: 'clipboard',
          title: t('tasks.empty.title'),
          description: canCreate ? t('tasks.empty.description.manager') : t('tasks.empty.description.employee'),
          action: canCreate ? button(t('tasks.new'), { variant: 'primary', iconName: 'plus', onClick: onCreate }) : null,
          compact: true,
        })
      : taskLines(recent, { showAssignee }),
  );
}

function teamCard(team) {
  return card(
    { title: t('dashboard.team.title'), description: t('dashboard.team.description') },
    el(
      'div',
      { class: 'mini-stats' },
      el(
        'a',
        { class: 'mini-stat', href: '#/employees' },
        el('span', { class: 'mini-stat__value', text: formatNumber(team.size) }),
        el('span', { class: 'mini-stat__label', text: t('dashboard.team.people') }),
      ),
      el(
        'a',
        { class: 'mini-stat', href: '#/tasks?unassigned=true' },
        el('span', { class: 'mini-stat__value', text: formatNumber(team.unassigned) }),
        el('span', { class: 'mini-stat__label', text: t('dashboard.team.unassigned') }),
      ),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export function renderDashboard() {
  const user = getUser();
  const canCreate = canCreateTask(user);
  // An employee only ever sees their own work, so naming the assignee on every
  // row would repeat their address without adding anything.
  const showAssignee = canViewDirectory(user);
  const content = el('div', { class: 'dashboard' });

  const openCreateForm = () => openTaskForm({ onSaved: load });

  function paint({ summary, recent, attention, team }) {
    if (summary.total === 0) {
      renderInto(
        content,
        emptyState({
          iconName: 'clipboard',
          title: t('tasks.empty.title'),
          description: canCreate ? t('tasks.empty.description.manager') : t('tasks.empty.description.employee'),
          action: canCreate
            ? button(t('tasks.new'), { variant: 'primary', iconName: 'plus', onClick: openCreateForm })
            : null,
        }),
      );
      return;
    }

    renderInto(
      content,
      statsRow(summary),
      el(
        'div',
        { class: 'dashboard__columns' },
        el(
          'div',
          { class: 'dashboard__main' },
          attentionCard(attention, { canCreate, showAssignee }),
          recentCard(recent, { canCreate, onCreate: openCreateForm, showAssignee }),
        ),
        el(
          'div',
          { class: 'dashboard__side' },
          statusCard(summary),
          priorityCard(summary),
          team ? teamCard(team) : null,
        ),
      ),
    );
  }

  async function load() {
    renderInto(content, skeletonStats(), el('div', { class: 'dashboard__columns' }, skeletonCards(2), skeletonCards(2)));
    try {
      paint(await fetchOverview(user));
    } catch (error) {
      renderInto(content, errorState({ error, onRetry: load }));
    }
  }

  load();

  return el(
    'div',
    {},
    pageHeader({
      title: t('dashboard.title'),
      description: canCreate ? t('dashboard.subtitle.manager') : t('dashboard.subtitle.employee'),
      actions: el(
        'div',
        { class: 'page-header__actions' },
        button(t('action.refresh'), { iconName: 'refresh', onClick: load }),
        canCreate ? button(t('tasks.new'), { variant: 'primary', iconName: 'plus', onClick: openCreateForm }) : null,
      ),
    }),
    content,
  );
}

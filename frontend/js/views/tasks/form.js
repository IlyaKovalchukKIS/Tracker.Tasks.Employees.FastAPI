/**
 * Create and edit dialog for a task.
 */

import { tasks as tasksApi } from '../../core/api.js';
import { loadDirectory } from '../../core/directory.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../core/domain.js';
import { t, taskPriorityLabel, taskStatusLabel } from '../../core/i18n.js';
import { fromLocalInputValue, toLocalInputValue } from '../../core/time.js';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, compact, validateRequired } from '../../core/validate.js';
import { el, fragment } from '../../ui/dom.js';
import { openModal, toast } from '../../ui/feedback.js';
import {
  characterCounter,
  field,
  focusFirstError,
  formError,
  input,
  select,
  setFieldErrors,
  textarea,
} from '../../ui/forms.js';
import { button, setButtonLoading } from '../../ui/primitives.js';

const PARENT_CHOICE_LIMIT = 100;

async function parentChoices(currentTask) {
  try {
    const response = await tasksApi.list({ page: 1, limit: PARENT_CHOICE_LIMIT, sort: '-updated_at' });
    const choices = response.items.filter((item) => item.id !== currentTask?.id);
    if (currentTask?.parent_id && !choices.some((item) => item.id === currentTask.parent_id)) {
      try {
        choices.unshift(await tasksApi.get(currentTask.parent_id));
      } catch {
        /* the previous parent is no longer visible */
      }
    }
    return choices;
  } catch {
    return [];
  }
}

/**
 * Open the task editor.
 *
 * @param {object} options
 * @param {object|null} [options.task] Omit to create a new task.
 * @param {(task: object) => void} [options.onSaved] Receives the saved task.
 */
export async function openTaskForm({ task = null, onSaved } = {}) {
  const isEdit = Boolean(task);
  const [people, parents] = await Promise.all([loadDirectory(), parentChoices(task)]);

  const titleInput = input({
    type: 'text',
    value: task?.title ?? '',
    maxlength: MAX_TITLE_LENGTH,
    placeholder: t('task.titlePlaceholder'),
    autocomplete: 'off',
    autofocus: true,
  });

  const descriptionInput = textarea({
    value: task?.description ?? '',
    maxlength: MAX_DESCRIPTION_LENGTH,
    placeholder: t('task.descriptionPlaceholder'),
    rows: 5,
  });

  const statusSelect = select({
    options: TASK_STATUSES.map((value) => ({ value, label: taskStatusLabel(value) })),
    value: task?.status ?? 'TODO',
  });

  const prioritySelect = select({
    options: TASK_PRIORITIES.map((value) => ({ value, label: taskPriorityLabel(value) })),
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

  const parentSelect = select({
    options: [
      { value: '', label: t('task.noParent') },
      ...parents.map((item) => ({ value: item.id, label: `#${item.id} · ${item.title}` })),
    ],
    value: task?.parent_id ?? '',
  });

  const banner = formError();

  const titleField = field({
    name: 'title',
    label: t('task.field.title'),
    control: titleInput,
    required: true,
  });
  titleField.append(characterCounter(titleInput, MAX_TITLE_LENGTH));

  const descriptionField = field({
    name: 'description',
    label: t('task.field.description'),
    control: descriptionInput,
    hint: t('task.descriptionHint'),
    required: true,
  });
  descriptionField.append(characterCounter(descriptionInput, MAX_DESCRIPTION_LENGTH));

  const form = el(
    'form',
    { class: 'form', id: 'task-form', novalidate: true, onSubmit },
    banner,
    titleField,
    descriptionField,
    el(
      'div',
      { class: 'form-grid' },
      field({ name: 'status', label: t('task.field.status'), control: statusSelect }),
      field({ name: 'priority', label: t('task.field.priority'), control: prioritySelect }),
      field({ name: 'deadline', label: t('task.field.deadline'), control: deadlineInput, hint: t('task.deadlineHint') }),
      field({
        name: 'executor_id',
        label: t('task.field.assignee'),
        control: executorSelect,
        hint: people.length === 0 ? t('task.assigneeEmpty') : undefined,
      }),
    ),
    field({ name: 'parent_id', label: t('task.field.parent'), control: parentSelect, hint: t('task.parentHint') }),
  );

  const submit = button(isEdit ? t('action.saveChanges') : t('action.create'), {
    variant: 'primary',
    type: 'submit',
    form: 'task-form',
  });

  const modal = openModal({
    title: isEdit ? t('task.form.edit') : t('task.form.create'),
    description: isEdit ? t('task.form.editDescription') : t('task.form.createDescription'),
    body: form,
    footer: fragment(button(t('action.cancel'), { onClick: () => modal.close() }), submit),
  });

  async function onSubmit(event) {
    event.preventDefault();
    banner.setMessage(null);

    const errors = compact({
      title: validateRequired(titleInput.value, { max: MAX_TITLE_LENGTH }),
      description: validateRequired(descriptionInput.value, { max: MAX_DESCRIPTION_LENGTH }),
    });
    setFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      banner.setMessage(t('form.fixFields'));
      focusFirstError(form);
      return;
    }

    const payload = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      status: statusSelect.value,
      priority: prioritySelect.value,
      deadline: fromLocalInputValue(deadlineInput.value),
      executor_id: executorSelect.value ? Number(executorSelect.value) : null,
      parent_id: parentSelect.value ? Number(parentSelect.value) : null,
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
      focusFirstError(form);
    } finally {
      setButtonLoading(submit, false);
    }
  }
}

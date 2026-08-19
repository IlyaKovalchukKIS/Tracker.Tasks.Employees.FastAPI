/**
 * Form controls with labels, hints, and validation messages wired together.
 *
 * Every control is built through `field()`, which links the label, the hint and
 * the error slot to the input so screen readers announce them.
 */

import { t } from '../core/i18n.js';
import { el } from './dom.js';
import { icon } from './icons.js';

let sequence = 0;
const nextId = (prefix) => `${prefix}-${(sequence += 1)}`;

export function input(props = {}) {
  return el('input', { class: 'input', ...props });
}

export function textarea(props = {}) {
  return el('textarea', { class: 'textarea', ...props });
}

/** A `<select>` built from `[{ value, label }]` options. */
export function select({ options = [], value, ...props } = {}) {
  const node = el('select', { class: 'select', ...props });
  setOptions(node, options, value);
  return node;
}

/** Replace a select's options, keeping the current value when it still exists. */
export function setOptions(node, options, value = node.value) {
  node.replaceChildren(
    ...options.map((option) =>
      el('option', {
        value: option.value,
        text: option.label,
        selected: String(option.value) === String(value ?? ''),
      }),
    ),
  );
}

export function checkbox({ label, ...props } = {}) {
  const control = el('input', { type: 'checkbox', ...props });
  return el('label', { class: 'checkbox' }, control, el('span', { text: label }));
}

/** The actual input inside a field, even when it is wrapped (password toggle). */
function fieldControl(node) {
  return node.matches?.('input, select, textarea') ? node : node.querySelector('input, select, textarea');
}

/**
 * Wrap a control with its label, hint, and validation slot.
 * `name` links the wrapper to API field errors via `setFieldErrors`.
 */
export function field({ name, label, control, hint, required = false }) {
  const widget = fieldControl(control);
  const id = widget.id || nextId('field');
  widget.id = id;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  widget.setAttribute('aria-describedby', [hint ? hintId : null, errorId].filter(Boolean).join(' '));
  if (required) widget.required = true;

  return el(
    'div',
    { class: 'field', dataset: { field: name } },
    // The required marker is drawn with CSS so it stays out of the label's
    // accessible name; `required` on the control carries the semantics.
    el('label', { class: `field__label${required ? ' field__label--required' : ''}`, for: id, text: label }),
    control,
    hint ? el('p', { class: 'field__hint', id: hintId, text: hint }) : null,
    el('p', { class: 'field__error', id: errorId, role: 'alert' }),
  );
}

/** A labelled control for toolbars, where the label sits above a compact input. */
export function filterField({ label, control }) {
  const id = control.id || nextId('filter');
  control.id = id;
  return el('div', { class: 'filter-field' }, el('label', { class: 'filter-field__label', for: id, text: label }), control);
}

/** Search box with a leading icon and a clear control once there is text. */
export function searchField({ label, ...props }) {
  const control = input({ type: 'search', 'aria-label': label, autocomplete: 'off', ...props });
  const clear = el('button', {
    type: 'button',
    class: 'btn btn--ghost btn--sm btn--icon search-field__clear',
    'aria-label': t('a11y.clearSearch'),
    hidden: !control.value,
    onClick: () => {
      control.value = '';
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.focus();
    },
  });
  clear.append(icon('x'));

  const syncClear = () => {
    clear.hidden = !control.value;
  };
  control.addEventListener('input', syncClear);

  return {
    control,
    node: el('div', { class: 'search-field' }, icon('search'), control, clear),
    syncClear,
  };
}

/** Password input with a show/hide toggle that never submits the surrounding form. */
export function withPasswordToggle(control) {
  const toggle = el('button', {
    type: 'button',
    class: 'btn btn--ghost btn--sm btn--icon password-field__toggle',
    onClick: () => {
      control.type = control.type === 'password' ? 'text' : 'password';
      paint();
    },
  });

  function paint() {
    const hidden = control.type === 'password';
    toggle.replaceChildren(icon(hidden ? 'eye' : 'eyeOff'));
    toggle.setAttribute('aria-label', hidden ? t('a11y.showPassword') : t('a11y.hidePassword'));
    toggle.title = toggle.getAttribute('aria-label');
  }

  paint();
  return el('div', { class: 'password-field' }, control, toggle);
}

/** Show `errors` next to the matching fields; pass `{}` to clear them all. */
export function setFieldErrors(container, errors = {}) {
  container.querySelectorAll('[data-field]').forEach((wrapper) => {
    const message = errors[wrapper.dataset.field];
    const slot = wrapper.querySelector('.field__error');
    const control = wrapper.querySelector('.input, .select, .textarea');
    if (slot) slot.textContent = message ?? '';
    if (control) {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  });
}

/** Move focus to the first field the person needs to fix. */
export function focusFirstError(container) {
  container.querySelector('[aria-invalid="true"]')?.focus();
}

/** Banner for errors that belong to the whole form rather than one field. */
export function formError() {
  const message = el('span', {});
  const node = el('div', { class: 'form-error', role: 'alert', hidden: true }, icon('alertTriangle'), message);
  node.setMessage = (text) => {
    message.textContent = text ?? '';
    node.hidden = !text;
  };
  return node;
}

/** Inline confirmation shown after a form saved successfully. */
export function formSuccess() {
  const message = el('span', {});
  const node = el('div', { class: 'form-success', role: 'status', hidden: true }, icon('checkCircle'), message);
  node.setMessage = (text) => {
    message.textContent = text ?? '';
    node.hidden = !text;
  };
  return node;
}

/** Character counter that warns as the API's maximum length approaches. */
export function characterCounter(control, max) {
  const node = el('p', { class: 'field__counter', 'aria-hidden': 'true' });
  const update = () => {
    const used = control.value.length;
    node.textContent = t('form.charactersLeft', { count: Math.max(0, max - used) });
    node.classList.toggle('field__counter--warning', used > max * 0.9);
  };
  control.addEventListener('input', update);
  update();
  return node;
}

/**
 * Reusable UI building blocks: element helper, icons, badges, toasts, modals,
 * and the loading / empty / error placeholders shared by every view.
 */

import { formatDate, parseTimestamp, t, taskPriorityLabel, taskStatusLabel, roleLabel } from './i18n.js';

/* ------------------------------------------------------------------ */
/* Element helper                                                      */
/* ------------------------------------------------------------------ */

function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) appendChildren(node, child);
    else node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// Reflected as read-only DOM properties, so they must be set as attributes.
const ATTRIBUTE_ONLY = new Set(['form', 'list']);

/**
 * Create an element. `props` accepts DOM properties (`value`, `disabled`),
 * `class`, `dataset`, `on<Event>` listeners, and any other key as an attribute.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node && !ATTRIBUTE_ONLY.has(key)) node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  appendChildren(node, children);
  return node;
}

export function fragment(...children) {
  const frag = document.createDocumentFragment();
  appendChildren(frag, children);
  return frag;
}

/** Replace the contents of `container` with `children`. */
export function renderInto(container, ...children) {
  container.replaceChildren();
  appendChildren(container, children);
  return container;
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

const ICON_PATHS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkSquare:
    '<path d="M9 11l3 3 5-6"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16.5 16.5"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z"/>',
  trash:
    '<path d="M3 6h18"/><path d="M9 6V4h6v2"/><path d="M18.5 6l-1 14.1H6.5L5.5 6"/><path d="M10 11v6M14 11v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  users:
    '<circle cx="9.5" cy="8" r="3.6"/><path d="M2.5 21a7 7 0 0 1 14 0"/><path d="M17 5.2a3.6 3.6 0 0 1 0 6.9"/><path d="M18.5 14.4A6 6 0 0 1 22 20"/>',
  shield: '<path d="M12 21.5s7.5-3.6 7.5-9.5V5.2L12 2.5 4.5 5.2v6.8c0 5.9 7.5 9.5 7.5 9.5z"/>',
  clipboard:
    '<path d="M9 4H7.5A2.5 2.5 0 0 0 5 6.5v13A2.5 2.5 0 0 0 7.5 22h9a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 16.5 4H15"/><rect x="9" y="2" width="6" height="4" rx="1.2"/><path d="M9 12h6M9 16h4"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4.5h9l-1 4h6v7h-8l-1-4H5"/>',
  inbox:
    '<path d="M3 13h4.5l1.8 3h5.4l1.8-3H21"/><path d="M5.5 5h13l2.5 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.8h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronLeft: '<path d="m14.5 18-6-6 6-6"/>',
  chevronRight: '<path d="m9.5 6 6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  sun:
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  moon: '<path d="M20.8 13.5A8.6 8.6 0 1 1 10.5 3.2a6.8 6.8 0 0 0 10.3 10.3z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="m9 16-4-4 4-4"/><path d="M5 12h10"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5v5h-5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 6.8 8.2 5.6 8.2-5.6"/>',
  key: '<circle cx="8" cy="15.5" r="4"/><path d="m11 12.5 8.5-8.5"/><path d="m16.5 5.5 3 3"/><path d="m14 8 3 3"/>',
  link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  slash: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
};

/** Build an inline SVG icon. Markup comes from the constant map above. */
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICON_PATHS[name] ?? '';
  return svg;
}

/* ------------------------------------------------------------------ */
/* Badges and inline metadata                                          */
/* ------------------------------------------------------------------ */

const STATUS_TONE = { TODO: 'neutral', IN_PROGRESS: 'info', DONE: 'success', CANCELLED: 'danger' };
const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' };
const ROLE_TONE = { ADMIN: 'accent', MANAGER: 'info', EMPLOYEE: 'neutral' };

export function badge(text, tone = 'neutral', { plain = false } = {}) {
  return el('span', { class: `badge badge--${tone}${plain ? ' badge--plain' : ''}`, text });
}

export const statusBadge = (status) => badge(taskStatusLabel(status), STATUS_TONE[status] ?? 'neutral');
export const priorityBadge = (priority) =>
  badge(taskPriorityLabel(priority), PRIORITY_TONE[priority] ?? 'neutral');
export const roleBadge = (role) => badge(roleLabel(role), ROLE_TONE[role] ?? 'neutral', { plain: true });
export const activeBadge = (isActive) =>
  badge(isActive ? t('status.active') : t('status.inactive'), isActive ? 'success' : 'danger');

/** Icon plus text, used for deadlines, assignees, and timestamps in list rows. */
export function meta(iconName, text, { tone } = {}) {
  return el('span', { class: `meta${tone ? ` meta--${tone}` : ''}` }, icon(iconName), el('span', { text }));
}

/**
 * Human-readable deadline with an overdue flag, so lists can highlight late work.
 * Tasks that are already DONE or CANCELLED are never marked overdue.
 */
export function deadlineMeta(deadline, status) {
  const due = parseTimestamp(deadline);
  if (!due) return meta('calendar', t('task.noDeadline'));
  const closed = status === 'DONE' || status === 'CANCELLED';
  const overdue = !closed && due.getTime() < Date.now();
  const text = formatDate(deadline, { withTime: true });
  return meta('clock', overdue ? `${text} · ${t('task.overdue')}` : text, {
    tone: overdue ? 'danger' : undefined,
  });
}

export function avatar(email) {
  return el('span', { class: 'avatar', 'aria-hidden': 'true', text: (email || '?').charAt(0) });
}

/* ------------------------------------------------------------------ */
/* Buttons and forms                                                   */
/* ------------------------------------------------------------------ */

export function button(
  label,
  { variant = 'default', iconName, size, block = false, type = 'button', ...props } = {},
) {
  const classes = ['btn'];
  if (variant !== 'default') classes.push(`btn--${variant}`);
  if (size) classes.push(`btn--${size}`);
  if (block) classes.push('btn--block');
  if (!label) classes.push('btn--icon');
  return el(
    'button',
    { type, class: classes.join(' '), ...props },
    iconName ? icon(iconName) : null,
    label ? el('span', { text: label }) : null,
  );
}

export function setButtonLoading(node, loading) {
  node.classList.toggle('btn--loading', loading);
  node.disabled = loading;
}

let fieldSequence = 0;

/**
 * Wrap a control with its label, hint, and a slot for validation messages.
 * `name` links the wrapper to API field errors via `setFieldErrors`.
 */
export function field({ name, label, control, hint, required = false }) {
  const id = control.id || `field-${(fieldSequence += 1)}`;
  control.id = id;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, errorId].filter(Boolean).join(' ');
  control.setAttribute('aria-describedby', describedBy);
  if (required) control.required = true;

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

export function input(props = {}) {
  return el('input', { class: 'input', ...props });
}

export function textarea(props = {}) {
  return el('textarea', { class: 'textarea', ...props });
}

/** A `<select>` built from `[{ value, label }]` options. */
export function select({ options, value, ...props } = {}) {
  const node = el('select', { class: 'select', ...props });
  for (const option of options) {
    node.append(
      el('option', {
        value: option.value,
        text: option.label,
        selected: String(option.value) === String(value ?? ''),
      }),
    );
  }
  return node;
}

export function checkbox({ label, ...props }) {
  return el('label', { class: 'checkbox' }, el('input', { type: 'checkbox', ...props }), el('span', { text: label }));
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

/** Banner for errors that belong to the whole form rather than one field. */
export function formError(message) {
  const node = el('div', { class: 'form-error', role: 'alert', hidden: !message }, icon('alert'), el('span', {}));
  node.lastChild.textContent = message ?? '';
  node.setMessage = (text) => {
    node.lastChild.textContent = text ?? '';
    node.hidden = !text;
  };
  return node;
}

/* ------------------------------------------------------------------ */
/* Placeholder states                                                  */
/* ------------------------------------------------------------------ */

export function skeletonList(rows = 4) {
  return el(
    'div',
    { class: 'item-list', 'aria-busy': 'true', 'aria-label': t('a11y.loading') },
    ...Array.from({ length: rows }, () =>
      el(
        'div',
        { class: 'skeleton-item' },
        el('div', { class: 'skeleton', style: { height: '18px', width: '45%' } }),
        el('div', { class: 'skeleton', style: { height: '12px', width: '80%' } }),
        el('div', { class: 'skeleton', style: { height: '12px', width: '30%' } }),
      ),
    ),
  );
}

export function emptyState({ iconName = 'inbox', title, description, action }) {
  return el(
    'div',
    { class: 'state' },
    el('div', { class: 'state__icon' }, icon(iconName)),
    el('h2', { text: title }),
    description ? el('p', { class: 'state__description', text: description }) : null,
    action ?? null,
  );
}

export function errorState({ message, onRetry }) {
  return el(
    'div',
    { class: 'state state--error', role: 'alert' },
    el('div', { class: 'state__icon' }, icon('alert')),
    el('h2', { text: t('error.title') }),
    el('p', { class: 'state__description', text: message }),
    onRetry ? button(t('action.retry'), { iconName: 'refresh', onClick: onRetry }) : null,
  );
}

export function pageLoader() {
  return el(
    'div',
    { class: 'page-loader', 'aria-label': t('a11y.loading'), role: 'status' },
    el('span', { class: 'spinner' }),
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                             */
/* ------------------------------------------------------------------ */

const TOAST_ICONS = { success: 'check', error: 'alert', info: 'info' };
const MAX_VISIBLE_TOASTS = 3;

export function toast(message, type = 'info', { timeout = 5000 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const node = el(
    'div',
    { class: `toast toast--${type}` },
    el('span', { class: 'toast__icon' }, icon(TOAST_ICONS[type] ?? 'info')),
    el('span', { class: 'toast__message', text: message }),
    el(
      'button',
      {
        type: 'button',
        class: 'toast__close',
        'aria-label': t('a11y.dismiss'),
        onClick: () => node.remove(),
      },
      icon('x'),
    ),
  );

  root.append(node);
  while (root.children.length > MAX_VISIBLE_TOASTS) root.firstElementChild.remove();
  setTimeout(() => node.remove(), timeout);
}

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const modalStack = [];

/**
 * Open a modal dialog with a focus trap, Escape to dismiss, and focus returned
 * to the element that opened it.
 *
 * @returns {{ close: () => void, body: HTMLElement, footer: HTMLElement }}
 */
export function openModal({ title, body, footer, size, onClose }) {
  const opener = document.activeElement;
  const titleId = `modal-title-${(fieldSequence += 1)}`;

  const bodyNode = el('div', { class: 'modal__body' }, body);
  const footerNode = footer ? el('div', { class: 'modal__footer' }, footer) : null;

  const dialog = el(
    'div',
    {
      class: `modal${size ? ` modal--${size}` : ''}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    },
    el(
      'div',
      { class: 'modal__header' },
      el('h2', { id: titleId, text: title }),
      button('', { variant: 'ghost', iconName: 'x', 'aria-label': t('a11y.closeDialog'), onClick: () => close() }),
    ),
    bodyNode,
    footerNode,
  );

  const overlay = el(
    'div',
    {
      class: 'modal-overlay',
      onMousedown: (event) => {
        if (event.target === overlay) close();
      },
    },
    dialog,
  );

  function onKeydown(event) {
    if (modalStack[modalStack.length - 1] !== handle) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    if (!modalStack.includes(handle)) return;
    modalStack.splice(modalStack.indexOf(handle), 1);
    document.removeEventListener('keydown', onKeydown, true);
    overlay.remove();
    if (modalStack.length === 0) document.body.classList.remove('modal-open');
    if (opener instanceof HTMLElement) opener.focus();
    onClose?.();
  }

  const handle = { close, body: bodyNode, footer: footerNode, dialog };

  modalStack.push(handle);
  document.body.classList.add('modal-open');
  document.getElementById('modal-root').append(overlay);
  document.addEventListener('keydown', onKeydown, true);

  const autofocus = dialog.querySelector('[autofocus]') || dialog.querySelector(FOCUSABLE);
  autofocus?.focus();

  return handle;
}

/** Confirmation dialog that resolves to `true` only when the action is confirmed. */
export function confirmDialog({ title, message, confirmLabel, danger = false }) {
  return new Promise((resolve) => {
    let confirmed = false;
    const modal = openModal({
      title,
      size: 'sm',
      body: el('p', { text: message }),
      footer: fragment(
        button(t('action.cancel'), { onClick: () => modal.close() }),
        button(confirmLabel ?? t('action.delete'), {
          variant: danger ? 'danger' : 'primary',
          autofocus: true,
          onClick: () => {
            confirmed = true;
            modal.close();
          },
        }),
      ),
      onClose: () => resolve(confirmed),
    });
  });
}

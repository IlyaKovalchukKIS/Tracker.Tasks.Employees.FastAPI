/**
 * Transient interface: toasts, modal dialogs, confirmations, and menus.
 */

import { t } from '../core/i18n.js';
import { el, fragment } from './dom.js';
import { icon } from './icons.js';
import { button } from './primitives.js';

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

const TOAST_ICONS = { success: 'checkCircle', error: 'alertTriangle', info: 'info' };
const MAX_VISIBLE_TOASTS = 3;

/** Confirm an action that already happened. Never use it to report a blocker. */
export function toast(message, type = 'info', { timeout = 5000 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const node = el(
    'div',
    { class: `toast toast--${type}` },
    el('span', { class: 'toast__icon' }, icon(TOAST_ICONS[type] ?? 'info')),
    el('span', { class: 'toast__message', text: message }),
    button('', {
      variant: 'ghost',
      size: 'sm',
      iconName: 'x',
      class: 'toast__close',
      'aria-label': t('a11y.dismiss'),
      onClick: () => node.remove(),
    }),
  );

  root.append(node);
  while (root.children.length > MAX_VISIBLE_TOASTS) root.firstElementChild.remove();
  setTimeout(() => node.remove(), timeout);
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const modalStack = [];
let modalSequence = 0;

/**
 * Open a modal dialog with a focus trap, Escape to dismiss, and focus returned
 * to the element that opened it.
 *
 * @returns {{ close: () => void, body: HTMLElement }}
 */
export function openModal({ title, description, body, footer, size, onClose }) {
  const opener = document.activeElement;
  const titleId = `modal-title-${(modalSequence += 1)}`;
  const descriptionId = description ? `${titleId}-description` : null;

  const bodyNode = el('div', { class: 'modal__body' }, body);

  const dialog = el(
    'div',
    {
      class: `modal${size ? ` modal--${size}` : ''}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
    },
    el(
      'div',
      { class: 'modal__header' },
      el(
        'div',
        { class: 'modal__heading' },
        el('h2', { id: titleId, text: title }),
        description ? el('p', { id: descriptionId, class: 'modal__description', text: description }) : null,
      ),
      button('', {
        variant: 'ghost',
        iconName: 'x',
        'aria-label': t('a11y.closeDialog'),
        onClick: () => close(),
      }),
    ),
    bodyNode,
    footer ? el('div', { class: 'modal__footer' }, footer) : null,
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
      event.stopPropagation();
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
    if (modalStack.length === 0) document.body.classList.remove('is-locked');
    if (opener instanceof HTMLElement) opener.focus();
    onClose?.();
  }

  const handle = { close, body: bodyNode, dialog };

  modalStack.push(handle);
  document.body.classList.add('is-locked');
  document.getElementById('modal-root').append(overlay);
  document.addEventListener('keydown', onKeydown, true);

  (dialog.querySelector('[autofocus]') || dialog.querySelector(FOCUSABLE))?.focus();

  return handle;
}

/**
 * Ask before doing something irreversible.
 * Resolves to `true` only when the action was confirmed.
 */
export function confirmDialog({ title, message, confirmLabel, danger = false }) {
  return new Promise((resolve) => {
    let confirmed = false;
    const modal = openModal({
      title,
      size: 'sm',
      body: el('p', { class: 'modal__text', text: message }),
      footer: fragment(
        button(t('action.cancel'), {
          autofocus: danger,
          onClick: () => modal.close(),
        }),
        button(confirmLabel ?? t('action.delete'), {
          variant: danger ? 'danger' : 'primary',
          autofocus: !danger,
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

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

/**
 * A button that opens a small menu.
 *
 * @param {object} options
 * @param {HTMLElement} options.trigger Button that toggles the menu.
 * @param {Array} options.items `{ label, iconName, onSelect, danger, href }`,
 *   or `{ separator: true }`.
 * @param {'start'|'end'} [options.align] Which edge the menu lines up with.
 * @param {'above'|'below'} [options.placement] Which way the menu opens.
 */
export function menu({ trigger, items, align = 'end', placement = 'above', label }) {
  const list = el('div', {
    class: `menu menu--${align} menu--${placement}`,
    role: 'menu',
    'aria-label': label,
    hidden: true,
  });
  const wrapper = el('div', { class: 'menu-wrapper' }, trigger, list);

  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  const entries = items.filter(Boolean).map((item) => {
    if (item.separator) return el('hr', { class: 'menu__separator' });
    const props = {
      class: `menu__item${item.danger ? ' menu__item--danger' : ''}`,
      role: 'menuitem',
      tabindex: '-1',
      onClick: (event) => {
        if (!item.href) event.preventDefault();
        close();
        item.onSelect?.();
      },
    };
    return item.href
      ? el('a', { ...props, href: item.href, target: item.external ? '_blank' : null, rel: item.external ? 'noopener' : null },
          item.iconName ? icon(item.iconName) : null,
          el('span', { text: item.label }))
      : el('button', { ...props, type: 'button' },
          item.iconName ? icon(item.iconName) : null,
          el('span', { text: item.label }));
  });

  list.append(...entries);
  const focusable = () => [...list.querySelectorAll('.menu__item')];

  function open() {
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onOutside, true);
    focusable()[0]?.focus();
  }

  function close({ restoreFocus = false } = {}) {
    if (list.hidden) return;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onOutside, true);
    if (restoreFocus) trigger.focus();
  }

  function onOutside(event) {
    if (!wrapper.contains(event.target)) close();
  }

  trigger.addEventListener('click', () => (list.hidden ? open() : close()));

  wrapper.addEventListener('keydown', (event) => {
    const options = focusable();
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close({ restoreFocus: true });
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.hidden) open();
      else options[(index + 1) % options.length]?.focus();
    } else if (event.key === 'ArrowUp' && !list.hidden) {
      event.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus();
    } else if (event.key === 'Tab' && !list.hidden) {
      close();
    }
  });

  return wrapper;
}

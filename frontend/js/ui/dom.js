/**
 * Element construction helpers used by every component.
 */

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
 * Create an element.
 *
 * `props` accepts DOM properties (`value`, `disabled`), plus the special keys
 * `class`, `text`, `dataset`, `style` (an object of CSS properties) and
 * `on<Event>` listeners. Anything else becomes an attribute.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') Object.assign(node.style, value);
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

/** Text that only assistive technology reads. */
export const srOnly = (text) => el('span', { class: 'visually-hidden', text });

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Run `handler` for the current match state of a media query and whenever it
 * changes. Returns an unsubscribe function.
 */
export function watchMedia(query, handler) {
  const media = window.matchMedia(query);
  const listener = (event) => handler(event.matches);
  media.addEventListener('change', listener);
  handler(media.matches);
  return () => media.removeEventListener('change', listener);
}

/**
 * Like `watchMedia`, but stops once `node` has left the document, so a view the
 * router replaced does not keep reacting to viewport changes.
 */
export function watchMediaFor(node, query, handler) {
  let started = false;
  let stop = () => {};
  stop = watchMedia(query, (matches) => {
    if (started && !node.isConnected) {
      stop();
      return;
    }
    started = true;
    handler(matches);
  });
  return stop;
}

/**
 * Hash-based routing.
 *
 * Hash routes keep deep links working while the API serves the single page
 * application from a static mount, with no server rewrite rules to maintain.
 */

/** Split the current hash into a path and its query parameters. */
export function parseLocation(hash = location.hash) {
  const raw = hash.replace(/^#/, '');
  const [rawPath, rawSearch = ''] = raw.split('?');
  const path = rawPath && rawPath !== '/' ? rawPath.replace(/\/+$/, '') : '/';
  return {
    path: path.startsWith('/') ? path : `/${path}`,
    query: new URLSearchParams(rawSearch),
  };
}

/** Find the route whose pattern matches `path`, extracting `:param` segments. */
export function matchRoute(routes, path) {
  const segments = path.split('/').filter(Boolean);
  for (const route of routes) {
    const pattern = route.path.split('/').filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const params = {};
    const matched = pattern.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(segments[index]);
        return true;
      }
      return part === segments[index];
    });
    if (matched) return { route, params };
  }
  return null;
}

let renderHandler = () => {};

export function navigate(target, { replace = false } = {}) {
  const hash = target.startsWith('#') ? target : `#${target}`;
  if (location.hash === hash) {
    renderHandler();
    return;
  }
  if (replace) {
    history.replaceState(null, '', hash);
    renderHandler();
  } else {
    location.hash = hash;
  }
}

/**
 * Update the address bar without leaving the current view, so filter changes
 * stay shareable but do not push a history entry per keystroke.
 */
export function replaceQuery(path, queryString) {
  history.replaceState(null, '', queryString ? `#${path}?${queryString}` : `#${path}`);
}

/** Start routing and render the current location. */
export function startRouter(handler) {
  renderHandler = handler;
  window.addEventListener('hashchange', handler);
  handler();
}

/** Re-run the current route, for example after the language changed. */
export const rerender = () => renderHandler();

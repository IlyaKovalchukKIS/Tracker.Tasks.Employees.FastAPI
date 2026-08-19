/**
 * Inline SVG icons.
 *
 * A single stroked 24×24 set keeps the visual weight consistent and avoids
 * loading an icon font or an external sprite.
 */

const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7.5" height="8.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="5" rx="2"/><rect x="13.5" y="10.5" width="7.5" height="10.5" rx="2"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="2"/>',
  clipboard: '<path d="M9 4H7.5A2.5 2.5 0 0 0 5 6.5v13A2.5 2.5 0 0 0 7.5 22h9a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 16.5 4H15"/><rect x="9" y="2" width="6" height="4" rx="1.2"/><path d="M9 12h6M9 16h4"/>',
  users: '<circle cx="9.5" cy="8" r="3.6"/><path d="M2.5 21a7 7 0 0 1 14 0"/><path d="M17 5.2a3.6 3.6 0 0 1 0 6.9"/><path d="M18.5 14.4A6 6 0 0 1 22 20"/>',
  shield: '<path d="M12 21.5s7.5-3.6 7.5-9.5V5.2L12 2.5 4.5 5.2v6.8c0 5.9 7.5 9.5 7.5 9.5z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  circleDot: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
  xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16.5 16.5"/>',
  filter: '<path d="M3.5 5.5h17l-6.5 7.6V20l-4-2v-4.9z"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z"/>',
  trash: '<path d="M3 6h18"/><path d="M9 6V4h6v2"/><path d="M18.5 6l-1 14.1H6.5L5.5 6"/><path d="M10 11v6M14 11v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4.5h9l-1 4h6v7h-8l-1-4H5"/>',
  inbox: '<path d="M3 13h4.5l1.8 3h5.4l1.8-3H21"/><path d="M5.5 5h13l2.5 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>',
  alertTriangle: '<path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.2"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.8h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronLeft: '<path d="m14.5 18-6-6 6-6"/>',
  chevronRight: '<path d="m9.5 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9.5 6 6 6-6"/>',
  chevronUp: '<path d="m6 14.5 6-6 6 6"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  moon: '<path d="M20.8 13.5A8.6 8.6 0 1 1 10.5 3.2a6.8 6.8 0 0 0 10.3 10.3z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="m9 16-4-4 4-4"/><path d="M5 12h10"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5v5h-5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 6.8 8.2 5.6 8.2-5.6"/>',
  key: '<circle cx="8" cy="15.5" r="4"/><path d="m11 12.5 8.5-8.5"/><path d="m16.5 5.5 3 3"/><path d="m14 8 3 3"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5"/>',
  slash: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  activity: '<path d="M3 12.5h4l2.5-7 4.5 14 2.5-7H21"/>',
  layers: '<path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  eye: '<path d="M2.4 12S6 5.5 12 5.5 21.6 12 21.6 12 18 18.5 12 18.5 2.4 12 2.4 12z"/><circle cx="12" cy="12" r="3.1"/>',
  eyeOff: '<path d="m4 4 16 16"/><path d="M10.6 10.7a2.9 2.9 0 0 0 3.7 3.7"/><path d="M9.5 5.7A10 10 0 0 1 12 5.5C18 5.5 21.6 12 21.6 12a18 18 0 0 1-4.2 4.8"/><path d="M6.5 6.7C4.4 8.3 2.4 12 2.4 12a18 18 0 0 0 6.8 6.3M14.1 14.2 9.8 9.9"/>',
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
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ICON_PATHS[name] ?? '';
  return svg;
}

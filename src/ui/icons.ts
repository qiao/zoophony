/**
 * The inner SVG markup of each icon of the UI (design 2.8). The icons have a view box of 24 × 24
 * and show at 20 × 20 px, with a stroke width of 1.75, round caps and joins, and `currentColor`.
 */
const ICONS = {
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4.5H9"/>',
  volume:
    '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  'volume-off': '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  'reset-view':
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  camera:
    '<rect x="2.5" y="9" width="13" height="10" rx="2"/><path d="M15.5 12.5l6-3v9l-6-3z"/><circle cx="6.5" cy="5.5" r="2.5"/><circle cx="12" cy="5.5" r="2.5"/>',
  'full-screen': '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  'exit-full-screen': '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  drawer: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/>',
  file: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  collapse: '<path d="M6 15l6-6 6 6"/>',
} as const;

/** The name of one icon of the UI. */
export type IconName = keyof typeof ICONS;

/** The namespace of SVG elements. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an icon. A screen reader skips it, because the control that holds it has an
 * `aria-label` (design 2.8).
 *
 * @param name The icon.
 * @param className The class of the SVG element, or '' for none.
 * @returns The SVG element.
 */
export function createIcon(name: IconName, className = ''): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (className) {
    svg.setAttribute('class', className);
  }
  svg.innerHTML = ICONS[name];
  return svg;
}

/**
 * Replaces the icon of a control.
 *
 * @param svg The SVG element of the control.
 * @param name The new icon.
 */
export function setIcon(svg: SVGSVGElement, name: IconName): void {
  svg.innerHTML = ICONS[name];
}

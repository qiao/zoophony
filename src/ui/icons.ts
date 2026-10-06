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
    '<path d="M3.5 9a2 2 0 0 1 2-2h2l1.5-2.5h6L16.5 7h2a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  'full-screen':
    '<path d="M4 8.5V4h4.5M4 4l5.5 5.5M20 8.5V4h-4.5M20 4l-5.5 5.5M4 15.5V20h4.5M4 20l5.5-5.5M20 15.5V20h-4.5M20 20l-5.5-5.5"/>',
  'exit-full-screen':
    '<path d="M9.5 5v4.5H5M9.5 9.5L4 4M14.5 5v4.5H19M14.5 9.5L20 4M9.5 19v-4.5H5M9.5 14.5L4 20M14.5 19v-4.5H19M14.5 14.5L20 20"/>',
  drawer: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  file: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  collapse: '<path d="M6 15l6-6 6 6"/>',
  chevron: '<path d="M9.5 6l6 6-6 6"/>',
  sliders:
    '<path d="M4 7h3M11 7h9M4 12h9M17 12h3M4 17h1.5M9.5 17H20"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7.5" cy="17" r="2"/>',
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

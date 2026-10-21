/**
 * The paw print of the logo (design 2.8): four toes and one pad, filled with `currentColor`. The
 * load state of `index.html` holds the same markup.
 */
export const PAW_MARKUP =
  '<ellipse cx="4.8" cy="10.6" rx="2.1" ry="2.7" transform="rotate(-24 4.8 10.6)"/><ellipse cx="9.3" cy="5.6" rx="2.2" ry="2.9" transform="rotate(-8 9.3 5.6)"/><ellipse cx="14.7" cy="5.6" rx="2.2" ry="2.9" transform="rotate(8 14.7 5.6)"/><ellipse cx="19.2" cy="10.6" rx="2.1" ry="2.7" transform="rotate(24 19.2 10.6)"/><path d="M12 11.6c-3.4 0-6.6 3.7-6.6 6.6 0 1.9 1.5 3 3.2 3 1.4 0 2.3-.7 3.4-.7s2 .7 3.4.7c1.7 0 3.2-1.1 3.2-3 0-2.9-3.2-6.6-6.6-6.6z"/>';

/**
 * The GitHub mark (the Invertocat), filled with `currentColor` (design 2.8). The path is the file
 * `icons/mark-github-24.svg` of Primer Octicons, commit `ea8e6bb`, MIT license. The logo rules of
 * GitHub permit it as a link to a project, in its own shape and in white, black, or gray.
 */
const GITHUB_MARKUP =
  '<path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"/>';

/**
 * The inner SVG markup of each icon of the UI (design 2.8). The icons have a view box of 24 × 24
 * and show at 20 × 20 px, with a stroke width of 1.75, round caps and joins, and `currentColor`.
 * The paw of the logo and the GitHub mark are filled.
 */
const ICONS = {
  paw: PAW_MARKUP,
  github: GITHUB_MARKUP,
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
  chevron: '<path d="M9.5 6l6 6-6 6"/>',
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

import type { DemoId } from '../app/demos.ts';

/**
 * The inner SVG markup of the cover of each demo (design 2.8): a small picture of 40 × 30 units
 * with a warm gradient and a simple motif of the piece. The project draws them, so they need no
 * image file and no license of another author. Each id in the markup starts with `cover-` and
 * the demo id, because the six covers share one document.
 */
export const COVERS = {
  // A spring morning: a pale sun and a branch with blossoms.
  'boulanger-matin':
    '<defs><linearGradient id="cover-boulanger-matin-sky" x2="0" y2="1"><stop offset="0" stop-color="#f7d9c9"/><stop offset="1" stop-color="#d98c7c"/></linearGradient></defs>' +
    '<rect width="40" height="30" fill="url(#cover-boulanger-matin-sky)"/>' +
    '<circle cx="30" cy="20" r="7" fill="#fff3d1" opacity=".75"/>' +
    '<path d="M-1 7c9 1 17 7 24 18M11 10c2-4 6-6 10-5" fill="none" stroke="#5b3426" stroke-width="1.4" stroke-linecap="round"/>' +
    '<g fill="#fdecef"><circle cx="5" cy="8" r="2.4"/><circle cx="14" cy="12" r="2.6"/><circle cx="21" cy="5" r="2.2"/><circle cx="20" cy="20" r="2.4"/></g>' +
    '<g fill="#c4506a"><circle cx="5" cy="8" r=".9"/><circle cx="14" cy="12" r="1"/><circle cx="21" cy="5" r=".8"/><circle cx="20" cy="20" r=".9"/></g>',
  // The Ode to Joy: a rising sun with rays.
  'beethoven-9':
    '<defs><radialGradient id="cover-beethoven-9-sun" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".45" stop-color="#e7a24e"/><stop offset="1" stop-color="#6e3418"/></radialGradient></defs>' +
    '<rect width="40" height="30" fill="url(#cover-beethoven-9-sun)"/>' +
    '<path d="M20 30L2 4M20 30L11 0M20 30V0M20 30L29 0M20 30L38 4" stroke="#fff4d6" stroke-width="1.2" opacity=".55"/>' +
    '<circle cx="20" cy="30" r="9" fill="#fff6dc"/>',
  // A night music: the full moon and stars over a dark sky.
  'mozart-k525':
    '<defs><linearGradient id="cover-mozart-k525-night" x2="0" y2="1"><stop offset="0" stop-color="#25344d"/><stop offset="1" stop-color="#0b111c"/></linearGradient></defs>' +
    '<rect width="40" height="30" fill="url(#cover-mozart-k525-night)"/>' +
    '<circle cx="20" cy="15" r="9" fill="#e9e2cc" opacity=".18"/>' +
    '<circle cx="20" cy="15" r="6.5" fill="#ece5cf"/>' +
    '<g fill="#cfc6ab"><circle cx="18" cy="13" r="1.4"/><circle cx="22.5" cy="17" r="1.1"/><circle cx="21" cy="12" r=".6"/></g>' +
    '<g fill="#f4efe0"><circle cx="5" cy="5" r=".6"/><circle cx="33" cy="7" r=".7"/><circle cx="35" cy="22" r=".5"/><circle cx="8" cy="23" r=".5"/></g>',
  // A baroque concerto: three gold arches of a hall.
  'bach-bwv1048':
    '<defs><linearGradient id="cover-bach-bwv1048-hall" x2="0" y2="1"><stop offset="0" stop-color="#7c3b28"/><stop offset="1" stop-color="#2b140e"/></linearGradient></defs>' +
    '<rect width="40" height="30" fill="url(#cover-bach-bwv1048-hall)"/>' +
    '<path d="M4 26V14a5 5 0 0 1 10 0v12M15 26V12a5 5 0 0 1 10 0v14M26 26V14a5 5 0 0 1 10 0v12M2 26h36" fill="none" stroke="#e7b45a" stroke-width="1.3"/>' +
    '<circle cx="20" cy="9" r="1.2" fill="#f0c676"/>',
  // The Allegretto that ticks like a metronome.
  'beethoven-8':
    '<defs><linearGradient id="cover-beethoven-8-sepia" x2="0" y2="1"><stop offset="0" stop-color="#ecd0a2"/><stop offset="1" stop-color="#9a6a3d"/></linearGradient></defs>' +
    '<rect width="40" height="30" fill="url(#cover-beethoven-8-sepia)"/>' +
    '<path d="M15 27l3.5-22h3l3.5 22z" fill="#4a2c1b"/>' +
    '<path d="M20 24L26 7" stroke="#fbeed6" stroke-width="1.2" stroke-linecap="round"/>' +
    '<rect x="23" y="12" width="3" height="2.4" rx=".5" transform="rotate(20 24.5 13.2)" fill="#fbeed6"/>',
  // A quiet andante for the flute: water lilies on a dark pond.
  'mozart-k315':
    '<defs><linearGradient id="cover-mozart-k315-pond" x2="0" y2="1"><stop offset="0" stop-color="#1f4a4f"/><stop offset="1" stop-color="#0a1b1f"/></linearGradient></defs>' +
    '<rect width="40" height="30" fill="url(#cover-mozart-k315-pond)"/>' +
    '<path d="M2 9c5-2 9 2 14 0s9-2 14 0 6 1 8 0M3 25c5-2 9 2 14 0s9-2 14 0" fill="none" stroke="#7fb3a8" stroke-width=".8" opacity=".5"/>' +
    '<ellipse cx="13" cy="19" rx="7" ry="2.4" fill="#2f5b3e"/><ellipse cx="29" cy="14" rx="5" ry="1.8" fill="#2f5b3e"/>' +
    '<path d="M9.5 18c1-3 2.5-4 3.5-4.5 1 .5 2.5 1.5 3.5 4.5-2 1-5 1-7 0zM26.5 13c.8-2.4 2-3.2 2.5-3.5.6.3 1.7 1.1 2.5 3.5-1.6.8-3.4.8-5 0z" fill="#f6ecd6"/>' +
    '<circle cx="13" cy="17" r=".9" fill="#e7b45a"/><circle cx="29" cy="12.3" r=".7" fill="#e7b45a"/>',
} as const satisfies Readonly<Record<DemoId, string>>;

/** The namespace of SVG elements. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates the cover of a demo for its row in the demo list (design 2.8). A screen reader skips
 * it, because the row has the title in its `aria-label`.
 *
 * @param id The demo.
 * @returns The SVG element.
 */
export function createCover(id: DemoId): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 30');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'cover');
  svg.innerHTML = COVERS[id];
  return svg;
}

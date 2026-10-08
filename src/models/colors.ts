import { srgb } from './mesh.ts';
import type { Rgb } from './mesh.ts';
import type { SpeciesId } from './species.ts';

/** The three colors of a species (design 4.5, species colors), as CSS hex colors in sRGB. */
export interface SpeciesColors {
  /** The color of the body, the head, and the limbs. */
  readonly fur: string;
  /** The color of the belly, the face, and the inside of the ears. */
  readonly belly: string;
  /** The color of the accent parts of the species (design 4.5). */
  readonly accent: string;
}

/**
 * The colors of each species (design 4.5, species colors). The models and the seat dots of the
 * UI read them through `SPECIES`.
 */
export const SPECIES_COLORS = {
  rabbit: { fur: '#ece6ff', belly: '#f4f0ff', accent: '#e9a7a5' },
  'fox-red': { fur: '#ac6236', belly: '#eee2e0', accent: '#603a2a' },
  'fox-tan': { fur: '#997657', belly: '#eee4e4', accent: '#755035' },
  wolf: { fur: '#645e6f', belly: '#ece8ff', accent: '#4a4450' },
  elephant: { fur: '#75708c', belly: '#85809a', accent: '#887884' },
  bear: { fur: '#533621', belly: '#583c27', accent: '#735d4b' },
  cat: { fur: '#75707a', belly: '#e4dff4', accent: '#4e4b54' },
  hippo: { fur: '#77709d', belly: '#9890b8', accent: '#575073' },
  deer: { fur: '#a8774c', belly: '#e5d3b8', accent: '#3a2a20' },
  panda: { fur: '#e2dcee', belly: '#e2dcee', accent: '#46434c' },
  mouse: { fur: '#9a8b7e', belly: '#c9bcae', accent: '#d6a59a' },
  beaver: { fur: '#6a4630', belly: '#8c6a52', accent: '#3e2e26' },
  dog: { fur: '#bcb1c0', belly: '#c9bfd0', accent: '#44270f' },
  monkey: { fur: '#8a5a3a', belly: '#d9b892', accent: '#5a3a26' },
  pig: { fur: '#d99a8e', belly: '#e6b2a8', accent: '#c98276' },
  rhino: { fur: '#8e8a84', belly: '#a6a29b', accent: '#cfc6b5' },
  badger: { fur: '#7d7a76', belly: '#e6e1d8', accent: '#24211e' },
  meerkat: { fur: '#b99a6e', belly: '#d8c3a0', accent: '#2a1f17' },
  penguin: { fur: '#1f1d1c', belly: '#ece8e0', accent: '#d98a3a' },
  'polar-bear': { fur: '#f2eefc', belly: '#f8f5ff', accent: '#1a1715' },
} as const satisfies Readonly<Record<SpeciesId, SpeciesColors>>;

/** The colors of the stage and the props (design 4.5, scene colors), in linear values. */
export const SCENE_COLORS = {
  stageTop: srgb('#7a6359'),
  plankLine: srgb('#5e4b42'),
  stageSide: srgb('#3a2a22'),
  podium: srgb('#9a7446'),
  chair: srgb('#cdb27a'),
  stand: srgb('#1e1a16'),
  /**
   * The two large faces of the desk of a stand: a warm gray, so that the desk reads as an object
   * in a close shot. The black desks were the largest shapes of some close shots (UX audit
   * 2026-10-05, SC9). The darker `#2e2722` still looked black in the shade of the desk back.
   */
  standDesk: srgb('#544840'),
  /** The four narrow faces of the desk of a stand: a lighter edge around the desk. */
  standEdge: srgb('#a08b7a'),
  sheet: srgb('#ece6d6'),
} as const satisfies Readonly<Record<string, Rgb>>;

/** The colors of the instruments (design 4.5, instrument colors), in linear values. */
export const INSTRUMENT_COLORS = {
  /** The edges and the ribs of the violin and the viola. */
  violinWood: srgb('#7a3a20'),
  /** The arched top plate and the scroll of the violin and the viola. */
  violinTop: srgb('#b0562c'),
  celloWood: srgb('#7e3f1f'),
  celloTop: srgb('#b8622e'),
  bridge: srgb('#e3c99a'),
  fingerboard: srgb('#1b1714'),
  bowStick: srgb('#3b2a20'),
  bowHair: srgb('#e8e2d4'),
  strings: srgb('#9a9080'),
  harpFrame: srgb('#b07a45'),
  harpStrings: srgb('#e8e2d4'),
  pianoCase: srgb('#15120f'),
  /** The iron plate inside the piano: a dark gold, as in `mockup.png`. */
  pianoPlate: srgb('#6b5226'),
  /** The soundboard at the bottom of the inside of the piano: a warm spruce. */
  soundboard: srgb('#5a3c22'),
  /** The strings of the piano. */
  pianoStrings: srgb('#a89064'),
  /** The sheet music on the piano desk: the sheet color of the stands. */
  sheet: srgb('#ece6d6'),
  whiteKeys: srgb('#f2eee6'),
  blackKeys: srgb('#15120f'),
  folder: srgb('#2a2522'),
  silver: srgb('#c9c6bf'),
  oboe: srgb('#2a2522'),
  clarinet: srgb('#1f1b19'),
  bassoon: srgb('#7a4a2e'),
  brass: srgb('#dcb052'),
  kettle: srgb('#c27a44'),
  drumShell: srgb('#8a2f2a'),
  drumHead: srgb('#efe9dc'),
  hardware: srgb('#1e1a16'),
  stick: srgb('#cdb27a'),
  xylophoneBars: srgb('#b07a45'),
  xylophoneFrame: srgb('#3a2a22'),
  baton: srgb('#ece6d6'),
} as const satisfies Readonly<Record<string, Rgb>>;

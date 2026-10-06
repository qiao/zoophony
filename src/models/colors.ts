import { srgb } from './mesh.ts';
import type { Rgb } from './mesh.ts';

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
  /** The iron plate inside the piano. */
  pianoPlate: srgb('#b8913f'),
  /** The sheet music on the piano desk: the sheet color of the stands. */
  sheet: srgb('#ece6d6'),
  whiteKeys: srgb('#f2eee6'),
  blackKeys: srgb('#15120f'),
  folder: srgb('#2a2522'),
  silver: srgb('#c9c6bf'),
  oboe: srgb('#2a2522'),
  clarinet: srgb('#d6d1c6'),
  clarinetRings: srgb('#3a3530'),
  bassoon: srgb('#7a4a2e'),
  brass: srgb('#c9a14a'),
  kettle: srgb('#c27a44'),
  drumShell: srgb('#8a2f2a'),
  drumHead: srgb('#efe9dc'),
  hardware: srgb('#1e1a16'),
  stick: srgb('#cdb27a'),
  xylophoneBars: srgb('#b07a45'),
  xylophoneFrame: srgb('#3a2a22'),
  baton: srgb('#ece6d6'),
} as const satisfies Readonly<Record<string, Rgb>>;

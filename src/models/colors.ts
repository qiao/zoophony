import { srgb } from './mesh.ts';
import type { Rgb } from './mesh.ts';

/** The colors of the stage and the props (design 4.5, scene colors), in linear values. */
export const SCENE_COLORS = {
  stageTop: srgb('#7a5646'),
  plankLine: srgb('#5e4134'),
  stageSide: srgb('#3a2a22'),
  podium: srgb('#9a7446'),
  chair: srgb('#cdb27a'),
  stand: srgb('#1e1a16'),
  sheet: srgb('#ece6d6'),
} as const satisfies Readonly<Record<string, Rgb>>;

/** The colors of the instruments (design 4.5, instrument colors), in linear values. */
export const INSTRUMENT_COLORS = {
  violinWood: srgb('#9c5a43'),
  fingerboard: srgb('#1b1714'),
  bowStick: srgb('#3b2a20'),
  bowHair: srgb('#e8e2d4'),
} as const satisfies Readonly<Record<string, Rgb>>;

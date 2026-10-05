import { INSTRUMENT_COLORS } from '../colors.ts';
import { DEG, add, axisAngle, rotationBetween, sub, transform } from '../math.ts';
import type { Vec3 } from '../math.ts';
import { cylinder, icosphere } from '../primitives.ts';
import { PieceBuilder, hold, pieceSize } from './piece.ts';
import type { InstrumentModel } from './types.ts';

/**
 * The sizes of the concert harp, in meters (design 4.6). In the harp axes, the base stands on the
 * floor at the origin, and the player sits at +z. The column stands at the far side (-z). The
 * soundbox rises from the base to the player, and the neck joins the top of the column to the top
 * of the soundbox. The strings stand vertical in the plane x = 0, between the soundbox and the
 * neck.
 */
export const HARP = {
  height: 1.4,
  /** The bottom and the top of the column, as (y, z). */
  column: [
    [0.08, -0.38],
    [1.3, -0.38],
  ],
  /** The bottom and the top of the soundbox axis, as (y, z). */
  soundbox: [
    [0.08, -0.22],
    [0.98, 0.3],
  ],
  /** The neck from the top of the column to the top of the soundbox, as (y, z). */
  neck: [
    [1.3, -0.38],
    [1.25, -0.18],
    [1.12, 0.04],
    [1.0, 0.28],
  ],
  /** The number of strings that the model shows. */
  strings: 24,
  /** The MIDI keys of the lowest and the highest string of a concert harp: C1 and G7. */
  keys: [24, 103],
} as const;

/** The tilt of the harp back to the right shoulder of the player. */
const TILT = 12 * DEG;

/** The places of the bass string and of the treble string along z. */
const STRING_ENDS = [-0.17, 0.24] as const;

/** The diatonic step of each pitch class: a sharp plays on the string of the natural below it. */
const DIATONIC_STEPS = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6] as const;

/** The number of strings of a concert harp: C1 to G7, seven strings in each octave. */
const CONCERT_STRINGS = 47;

/**
 * Calculates the height of the neck above a point of the strings plane.
 *
 * @param z The position along z.
 * @returns The height of the bottom of the neck.
 */
function neckHeight(z: number): number {
  const points = HARP.neck;
  for (let i = 0; i + 1 < points.length; i++) {
    const [y0, z0] = points[i] ?? [0, 0];
    const [y1, z1] = points[i + 1] ?? [0, 0];
    if (z <= z1 || i + 2 === points.length) {
      return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0) - 0.035;
    }
  }
  return HARP.height;
}

/**
 * Calculates the height of the soundboard below a point of the strings plane.
 *
 * @param z The position along z.
 * @returns The height of the soundboard, where the string starts.
 */
function boardHeight(z: number): number {
  const [[y0, z0], [y1, z1]] = HARP.soundbox;
  // The soundboard lies 0.05 m in front of the axis, toward the neck.
  return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0) + 0.05;
}

/**
 * Calculates the middle of one string of the model, in the harp axes.
 *
 * @param index The string, from 0 (the bass string) to `HARP.strings - 1`.
 * @returns The point halfway between the soundboard and the neck.
 */
function stringMiddle(index: number): Vec3 {
  const [first, last] = STRING_ENDS;
  const z = first + ((last - first) * index) / (HARP.strings - 1);
  return [0, (boardHeight(z) + neckHeight(z)) / 2, z];
}

/**
 * Finds the string of the model that shows a MIDI key (design 4.6). A concert harp has a string
 * for each natural note from C1 to G7, and a pedal raises a string by a semitone. Thus a sharp
 * plays on the string of the natural below it. The 24 strings of the model show the 47 strings
 * evenly.
 *
 * @param key The MIDI key. A key outside the harp plays the nearest string.
 * @returns The index of the string, from 0 (the bass string) to `HARP.strings - 1`.
 */
export function harpString(key: number): number {
  const k = Math.round(key);
  const step = (n: number): number => Math.floor(n / 12) * 7 + (DIATONIC_STEPS[n % 12] ?? 0);
  const concert = Math.min(Math.max(step(k) - step(HARP.keys[0]), 0), CONCERT_STRINGS - 1);
  return Math.round((concert * (HARP.strings - 1)) / (CONCERT_STRINGS - 1));
}

/**
 * Calculates the place on the strings where a hand plucks a MIDI key, in the harp axes.
 *
 * @param key The MIDI key. A key outside the harp plays the nearest string.
 * @returns The middle of the string of the key.
 */
export function harpStringPosition(key: number): Vec3 {
  return stringMiddle(harpString(key));
}

/**
 * Builds the concert harp (design 4.6). It stands on the floor between the knees of the player,
 * and it leans back to the right shoulder. Both hands play the strings, the left hand from the
 * left side of the strings and the right hand from the right side.
 *
 * @returns The model.
 */
export function buildHarp(): InstrumentModel {
  const h = HARP;
  const frame = INSTRUMENT_COLORS.harpFrame;
  const piece = new PieceBuilder();
  const yz = ([y, z]: readonly [number, number], x = 0): Vec3 => [x, y, z];

  // The base, the column with its crown, and the neck.
  piece.bar([0, 0.04, -0.42], [0, 0.04, 0.08], 0.26, 0.08, frame);
  const [columnBottom, columnTop] = h.column;
  piece.rod(yz(columnBottom), yz(columnTop), 0.03, 6, frame);
  piece.add(icosphere(0.055, 0), frame, transform(add(yz(columnTop), [0, 0.04, 0])));
  for (let i = 0; i + 1 < h.neck.length; i++) {
    piece.bar(yz(h.neck[i] ?? [0, 0]), yz(h.neck[i + 1] ?? [0, 0]), 0.05, 0.07, frame);
  }
  // The soundbox: a square frustum, wide at the base and narrow at the top.
  const [boxBottom, boxTop] = h.soundbox;
  const axis = sub(yz(boxTop), yz(boxBottom));
  const boxLength = Math.hypot(...axis);
  piece.add(
    cylinder(1, 0.4, boxLength, 4),
    frame,
    transform(yz(boxBottom), rotationBetween([0, 1, 0], axis), [0.18, 1, 0.13]),
  );

  // The strings, from the bass string near the column to the treble string near the player.
  const middles: Vec3[] = [];
  for (let i = 0; i < h.strings; i++) {
    const middle = stringMiddle(i);
    const z = middle[2];
    piece.bar(
      [0, boardHeight(z), z],
      [0, neckHeight(z), z],
      0.004,
      0.004,
      INSTRUMENT_COLORS.harpStrings,
    );
    middles.push(middle);
  }

  const instrument = piece.build(
    'instrument',
    hold('floor', [0.15, 0, 0], axisAngle([1, 0, 0], TILT), [0, 0.017, -0.53]),
  );
  const low = middles[0] ?? [0, 0, 0];
  const high = middles.at(-1) ?? [0, 0, 0];
  const bassHand = middles[Math.round(h.strings * 0.35)] ?? low;
  const trebleHand = middles[Math.round(h.strings * 0.7)] ?? high;
  return {
    id: 'harp',
    parent: 'root',
    pieces: [instrument],
    grips: {
      palmL: { bone: 'instrument', at: add(bassHand, [-0.03, 0, 0]) },
      palmR: { bone: 'instrument', at: add(trebleHand, [0.03, 0, 0]) },
      mouth: null,
      chin: null,
    },
    targets: [
      {
        kind: 'strings',
        bone: 'instrument',
        from: low,
        to: high,
        normal: [1, 0, 0],
        keys: h.keys,
      },
    ],
    size: pieceSize(instrument),
  };
}

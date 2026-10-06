import { MathUtils, Quaternion, Vector3 } from 'three';
import { INSTRUMENT_COLORS } from '../colors.ts';
import { toQuat } from '../tuples.ts';
import type { Vec3 } from '../tuples.ts';
import { MeshBuilder, transform } from '../mesh.ts';
import type { MeshData } from '../mesh.ts';
import { box, cylinder, prism } from '../primitives.ts';
import type { OutlinePoint } from '../primitives.ts';
import { PieceBuilder, hold, pieceSize, placeCorners } from './piece.ts';
import type { InstrumentModel } from './types.ts';

/**
 * The sizes of the grand piano, in meters (design 4.6). In the piano axes, the origin is on the
 * floor below the middle of the front edge of the keys. The player sits at +z, the case runs to
 * -z, and the keys run along x with the lowest key at -x.
 */
export const PIANO = {
  /** The width of the 52 white keys together. */
  keyboardWidth: 1.24,
  /** The height of the top of the white keys. */
  keyTop: 0.7,
  /** The visible length of a white key and of a black key. */
  whiteKeyLength: 0.15,
  blackKeyLength: 0.09,
  /** The lowest and the highest key: A0 and C8. */
  keys: [21, 108],
  /** The width of the case, and its length from the front edge of the keys. */
  caseWidth: 1.4,
  caseLength: 2.0,
  /** The bottom and the top of the rim of the case. */
  caseBottom: 0.62,
  caseTop: 0.95,
  /** The angle of the open lid. */
  lidAngle: 35 * MathUtils.DEG2RAD,
} as const;

/** The piano bench: a seat of 0.75 × 0.35 m at the height of a chair seat (design 4.5). */
export const PIANO_BENCH = {
  width: 0.75,
  depth: 0.35,
  seatHeight: 0.45,
} as const;

/** The pitch classes of the black keys. */
const BLACK_KEYS: ReadonlySet<number> = new Set([1, 3, 6, 8, 10]);

/**
 * The outline of the rim around the point (-0.1, -1.0), counterclockwise from +y: the front edge,
 * the curved right side, the tail, and the straight left side.
 */
const CASE_CENTER: OutlinePoint = [-0.1, -1.0];

/** The scale of the outline of the gold plate inside the rim, around the center of the rim. */
const PLATE_SCALE = 0.9;
const CASE_OUTLINE: readonly OutlinePoint[] = (
  [
    [0.7, -0.17],
    [0.7, -0.55],
    [0.62, -0.85],
    [0.45, -1.1],
    [0.32, -1.35],
    [0.26, -1.6],
    [0.18, -1.82],
    [0.02, -1.98],
    [-0.25, -2.0],
    [-0.5, -1.93],
    [-0.66, -1.75],
    [-0.7, -1.5],
    [-0.7, -0.17],
  ] as const
).map(([x, z]): OutlinePoint => [x - CASE_CENTER[0], z - CASE_CENTER[1]]);

/**
 * Tells whether a MIDI key is a black key.
 *
 * @param key The MIDI key.
 * @returns True for a black key.
 */
function isBlack(key: number): boolean {
  return BLACK_KEYS.has(key % 12);
}

/**
 * Counts the white keys of the piano below a key.
 *
 * @param key The MIDI key.
 * @returns The number of white keys from A0 up to the key, the key excluded.
 */
function whiteKeysBelow(key: number): number {
  let count = 0;
  for (let k = PIANO.keys[0]; k < key; k++) {
    if (!isBlack(k)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates the place on a piano key where a finger plays it, in the piano axes.
 *
 * @param key The MIDI key. A key outside the piano plays the nearest key.
 * @returns The point on the top of the key: near the front of a white key, and on the middle of a
 *   black key.
 */
export function pianoKeyPosition(key: number): Vec3 {
  const p = PIANO;
  const k = Math.min(Math.max(Math.round(key), p.keys[0]), p.keys[1]);
  const width = p.keyboardWidth / 52;
  const left = -p.keyboardWidth / 2;
  if (isBlack(k)) {
    return [left + whiteKeysBelow(k) * width, p.keyTop + 0.012, -0.1];
  }
  return [left + (whiteKeysBelow(k) + 0.5) * width, p.keyTop, -0.04];
}

/**
 * Builds the grand piano (design 4.6). It stands on the floor in front of the player, with the
 * lid open to the right of the player. The celesta and the organs use it too.
 *
 * @returns The model.
 */
export function buildPiano(): InstrumentModel {
  const p = PIANO;
  const dark = INSTRUMENT_COLORS.pianoCase;
  const piece = new PieceBuilder();
  const half = p.keyboardWidth / 2;
  const front = -0.17;

  // The rim, and the open lid on its hinge along the left side.
  const rimAt = transform([CASE_CENTER[0], 0, CASE_CENTER[1]]);
  piece.add(prism(CASE_OUTLINE, p.caseBottom, p.caseTop), dark, rimAt, 'lacquer');
  // The gold iron plate inside the rim, which the open lid shows, as the piano of the polished
  // images.
  piece.add(
    prism(
      CASE_OUTLINE.map(([x, z]): OutlinePoint => [x * PLATE_SCALE, z * PLATE_SCALE]),
      p.caseTop,
      p.caseTop + 0.004,
    ),
    INSTRUMENT_COLORS.pianoPlate,
    rimAt,
    'metal',
  );
  const hingeX = -p.caseWidth / 2;
  const lid = placeCorners(
    prism(CASE_OUTLINE, 0, 0.02),
    transform([CASE_CENTER[0] - hingeX, 0, 0]),
  );
  piece.add(
    lid,
    dark,
    transform(
      [hingeX, p.caseTop, CASE_CENTER[1]],
      toQuat(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), p.lidAngle)),
    ),
    'lacquer',
  );
  // The prop stick stands on the right side of the rim and holds the lid.
  const propX = 0.33;
  const lidHeight = p.caseTop + (propX - hingeX) * Math.tan(p.lidAngle);
  piece.rod([propX, p.caseTop, -0.95], [propX, lidHeight, -0.95], 0.012, 4, dark, 'lacquer');

  // The key bed, the cheek blocks, the white keys, the fallboard, and the music desk.
  piece.add(
    box(p.caseWidth, 0.06, -front),
    dark,
    transform([0, p.keyTop - 0.05, front / 2]),
    'lacquer',
  );
  for (const side of [-1, 1]) {
    piece.add(
      box(0.08, 0.1, -front),
      dark,
      transform([side * (half + 0.04), p.keyTop, front / 2]),
      'lacquer',
    );
  }
  piece.add(
    box(p.keyboardWidth, 0.02, p.whiteKeyLength),
    INSTRUMENT_COLORS.whiteKeys,
    transform([0, p.keyTop - 0.01, -p.whiteKeyLength / 2]),
  );
  piece.add(
    box(p.keyboardWidth, 0.07, 0.02),
    dark,
    transform([0, p.keyTop + 0.025, front + 0.01]),
    'lacquer',
  );
  const deskTilt = toQuat(
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -15 * MathUtils.DEG2RAD),
  );
  piece.add(
    box(0.7, 0.26, 0.015),
    dark,
    transform([0, p.caseTop + 0.12, -0.38], deskTilt),
    'lacquer',
  );
  // The open sheet music on the desk, on its side to the player.
  const sheetAt = new Vector3(0, 0.01, 0.0085).applyQuaternion(new Quaternion(...deskTilt));
  piece.add(
    box(0.42, 0.2, 0.002),
    INSTRUMENT_COLORS.sheet,
    transform([0, p.caseTop + 0.12 + sheetAt.y, -0.38 + sheetAt.z], deskTilt),
  );

  // The black keys.
  for (let k = p.keys[0]; k <= p.keys[1]; k++) {
    if (isBlack(k)) {
      const [x] = pianoKeyPosition(k);
      piece.add(
        box(0.012, 0.012, p.blackKeyLength),
        INSTRUMENT_COLORS.blackKeys,
        transform([x, p.keyTop + 0.006, -p.whiteKeyLength + p.blackKeyLength / 2]),
      );
    }
  }

  // Three legs, and the lyre with the pedals.
  for (const [x, z] of [
    [-half, -0.3],
    [half, -0.3],
    [-0.15, -1.8],
  ] as const) {
    piece.add(cylinder(0.045, 0.035, p.caseBottom, 8), dark, transform([x, 0, z]), 'lacquer');
  }
  piece.add(
    box(0.16, p.caseBottom - 0.05, 0.04),
    dark,
    transform([0, 0.05 + (p.caseBottom - 0.05) / 2, -0.45]),
  );
  piece.add(box(0.2, 0.03, 0.12), dark, transform([0, 0.035, -0.42]));

  const instrument = piece.build(
    'instrument',
    hold('floor', [0, 0, -0.55], undefined, [0, 0, -0.05]),
  );
  const lowHand = pianoKeyPosition(48);
  const highHand = pianoKeyPosition(72);
  return {
    id: 'piano',
    parent: 'root',
    pieces: [instrument],
    grips: {
      palmL: { bone: 'instrument', at: [lowHand[0], p.keyTop + 0.04, -0.06] },
      palmR: { bone: 'instrument', at: [highHand[0], p.keyTop + 0.04, -0.06] },
      mouth: null,
      chin: null,
    },
    targets: [
      {
        kind: 'keyboard',
        bone: 'instrument',
        from: pianoKeyPosition(p.keys[0]),
        to: pianoKeyPosition(p.keys[1]),
        normal: [0, 1, 0],
        keys: p.keys,
      },
    ],
    size: pieceSize(instrument),
  };
}

/**
 * Builds the piano bench: a seat on four legs (design 4.5, 4.6). The seat center is above the
 * origin, and the player sits on it and faces -z.
 *
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildPianoBench(): MeshData {
  const b = PIANO_BENCH;
  const builder = new MeshBuilder();
  const color = INSTRUMENT_COLORS.pianoCase;
  builder.add(box(b.width, 0.06, b.depth), {
    color,
    at: transform([0, b.seatHeight - 0.03, 0]),
    finish: 'lacquer',
  });
  const legHeight = b.seatHeight - 0.06;
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      builder.add(box(0.04, legHeight, 0.04), {
        color,
        finish: 'lacquer',
        at: transform([(x * (b.width - 0.06)) / 2, legHeight / 2, (z * (b.depth - 0.06)) / 2]),
      });
    }
  }
  return builder.build();
}

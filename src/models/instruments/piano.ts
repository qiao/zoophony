import { MathUtils, Quaternion, Vector3 } from 'three';
import { INSTRUMENT_COLORS } from '../colors.ts';
import { toQuat } from '../tuples.ts';
import type { Vec3 } from '../tuples.ts';
import { MeshBuilder, transform } from '../mesh.ts';
import type { MeshData } from '../mesh.ts';
import { box, cylinder, prism, quad } from '../primitives.ts';
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

/**
 * The distance of the front of the keys in front of the floor point of the body of the pianist,
 * in head heights `H`, before a further 0.05 m (design 4.6). The keys stand as near as the
 * forearms of the polar bear pianist allow over its belly, so that its elbows bend
 * (`docs/decisions/2026-10-24-polar-bear-seat.md`).
 */
export const PIANO_FRONT_H = 1.55;

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

/**
 * The inside of the open case (design 4.5, 4.6), as the piano of `mockup.png`: a dark well with
 * the soundboard at its bottom, the iron plate at the keys, and the strings above them. The
 * first piano had a gold plate on the top of the rim, which read as a flat gold tray (mockup
 * review of 2026-10-07, gap 10). The depths are below the top of the rim, in meters.
 */
export const PIANO_INSIDE = {
  /** The scale of the inner outline of the rim wall, around the center of the rim. */
  scale: 0.92,
  /** The depth of the top of the soundboard. */
  soundboardDepth: 0.14,
  /** The depth of the top of the iron plate. */
  plateDepth: 0.08,
  /** The length of the iron plate from the front of the inside toward the tail. */
  plateLength: 0.22,
  /** The depth of the strings. */
  stringDepth: 0.06,
  /** The number of strings. Each one stands for a group of strings of the real piano. */
  strings: 16,
  /** The width of a string. */
  stringWidth: 0.016,
  /** The gap from each end of a string to the rim wall. */
  stringGap: 0.06,
} as const;

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
 * Makes the wall of the rim around the open inside: the outer faces, the inner faces, and the
 * top edge, between the outline and the outline scaled around the origin.
 *
 * @param outline The outline, counterclockwise when seen from +y, star-shaped around the origin.
 * @param scale The scale of the inner outline.
 * @param bottom The height of the bottom of the wall.
 * @param top The height of the top of the wall.
 * @returns 6 triangles for each point of the outline.
 */
function rimWall(
  outline: readonly OutlinePoint[],
  scale: number,
  bottom: number,
  top: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const [x0, z0] = outline[i] ?? [0, 0];
    const [x1, z1] = outline[(i + 1) % outline.length] ?? [0, 0];
    const [u0, w0, u1, w1] = [x0 * scale, z0 * scale, x1 * scale, z1 * scale];
    out.push(...quad([x0, bottom, z0], [x1, bottom, z1], [x1, top, z1], [x0, top, z0]));
    out.push(...quad([u1, bottom, w1], [u0, bottom, w0], [u0, top, w0], [u1, top, w1]));
    out.push(...quad([u0, top, w0], [x0, top, z0], [x1, top, z1], [u1, top, w1]));
  }
  return out;
}

/**
 * Finds the nearest point of an outline behind a point, on the line along -z.
 *
 * @param outline The outline.
 * @param x The x of the line.
 * @param z The z of the point.
 * @returns The z of the nearest edge of the outline below `z`, or `z` if no edge crosses the line
 *   there.
 */
function outlineBehind(outline: readonly OutlinePoint[], x: number, z: number): number {
  let nearest = -Infinity;
  for (let i = 0; i < outline.length; i++) {
    const [x0, z0] = outline[i] ?? [0, 0];
    const [x1, z1] = outline[(i + 1) % outline.length] ?? [0, 0];
    if (x0 === x1 || x < Math.min(x0, x1) || x > Math.max(x0, x1)) {
      continue;
    }
    const at = z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
    if (at < z) {
      nearest = Math.max(nearest, at);
    }
  }
  return Number.isFinite(nearest) ? nearest : z;
}

/**
 * Adds the inside of the open case ({@link PIANO_INSIDE}): the soundboard at the bottom of the
 * well, the iron plate at the keys, and the strings from the plate to the rim wall at the tail.
 *
 * @param piece The piece of the piano.
 * @param boardY The height of the bottom of the well.
 */
function addInside(piece: PieceBuilder, boardY: number): void {
  const inside = PIANO_INSIDE;
  const [cx, cz] = CASE_CENTER;
  const rimAt = transform([cx, 0, cz]);
  const outline = CASE_OUTLINE.map(([x, z]): OutlinePoint => [x * inside.scale, z * inside.scale]);
  const top = PIANO.caseTop;

  piece.add(prism(outline, boardY, boardY + 0.005), INSTRUMENT_COLORS.soundboard, rimAt);

  // The front of the inside is the straight front edge of the inner outline.
  const xs = outline.map(([x]) => x);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const front = Math.max(...outline.map(([, z]) => z));
  const plateY = top - inside.plateDepth;
  piece.add(
    box(right - left, 0.012, inside.plateLength),
    INSTRUMENT_COLORS.pianoPlate,
    transform([cx + (left + right) / 2, plateY - 0.006, cz + front - inside.plateLength / 2]),
    'metal',
  );

  const stringY = top - inside.stringDepth;
  const start = front - inside.stringGap;
  const step = (right - left - 2 * inside.stringGap) / (inside.strings - 1);
  const half = inside.stringWidth / 2;
  for (let i = 0; i < inside.strings; i++) {
    const x = left + inside.stringGap + i * step;
    const end = outlineBehind(outline, x, start) + inside.stringGap;
    if (end >= start) {
      continue;
    }
    piece.add(
      quad(
        [x - half, stringY, start],
        [x + half, stringY, start],
        [x + half, stringY, end],
        [x - half, stringY, end],
      ),
      INSTRUMENT_COLORS.pianoStrings,
      rimAt,
    );
  }
}

/**
 * Calculates the point in front of a piano key on the front edge of the white keys, at the height
 * of the top of the white keys, in the piano axes. For a white key, the point is at the middle of
 * its front edge. A black key is shorter and stands back from this edge, so its point is at the
 * line between the two white keys at its sides. The paw of the studio polar bear is longer than a
 * white key, so the palm of the pianist stays in front of this point, and the claws lie on the key
 * (design 5.3).
 *
 * @param key The MIDI key. A key outside the piano plays the nearest key.
 * @returns The point.
 */
export function pianoKeyFront(key: number): Vec3 {
  const [x] = pianoKeyPosition(key);
  return [x, PIANO.keyTop, 0];
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

  // The rim: the case below the soundboard, and the wall around the open inside. The open lid
  // shows the inside, as the piano of `mockup.png`.
  const rimAt = transform([CASE_CENTER[0], 0, CASE_CENTER[1]]);
  const inside = PIANO_INSIDE;
  const boardY = p.caseTop - inside.soundboardDepth;
  piece.add(prism(CASE_OUTLINE, p.caseBottom, boardY), dark, rimAt, 'lacquer');
  piece.add(rimWall(CASE_OUTLINE, inside.scale, boardY, p.caseTop), dark, rimAt, 'lacquer');
  addInside(piece, boardY);
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

  // The round belly of the studio polar bear reaches 0.45 m in front of the floor point, so the
  // keys of 2026-10-11 (0.55 H + 0.05 m, 0.26 m) went 15 cm into it. The keys of 2026-10-12
  // (0.60 m) kept the paws out of the belly (`pose/test-pianist-clearance.ts`), and the muzzle
  // came 2.2 cm near the front edge of the open lid. At 1.68 H + 0.05 m (0.66 m with the head of
  // the longer shins of 2026-10-14), the muzzle keeps 5.7 cm from it in a play
  // (`docs/research/2026-10-14-polar-fix.md`). On the T-pose polar bear at 0.85 of its size, the
  // arms reached straight to the keys at 1.68 H. At 1.55 H (0.56 m), the mean elbow is 104° to
  // 108°, the forearms go 4.3 cm into the belly (3.1 cm at 1.68 H), and the head keeps 14.6 cm
  // from the case. At 1.45 H, the elbows are 96° to 100°, and the forearms go 6.6 cm into it
  // (`docs/research/2026-10-24-polar-bear-seat.md`).
  const instrument = piece.build(
    'instrument',
    hold('floor', [0, 0, -PIANO_FRONT_H], undefined, [0, 0, -0.05]),
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
 * @param seatHeight The height of the seat, in meters.
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildPianoBench(seatHeight: number = PIANO_BENCH.seatHeight): MeshData {
  const b = { ...PIANO_BENCH, seatHeight };
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

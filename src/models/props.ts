import { SCENE_COLORS } from './colors.ts';
import { DEG, add, axisAngle, multiply, rotate, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { box, quad } from './primitives.ts';

/** The chair (design 4.5, props). The player sits on it and faces -z. */
export const CHAIR = {
  seatHeight: 0.45,
  seatWidth: 0.42,
  seatDepth: 0.4,
  backTop: 0.95,
  /** The heights of the two horizontal back slats. */
  slats: [0.66, 0.86],
} as const;

/** The music stand (design 4.5, props). The reader is at +z and faces -z. */
export const MUSIC_STAND = {
  deskWidth: 0.5,
  deskDepth: 0.35,
  deskHeight: 1.05,
  /** The tilt of the desk toward the reader. */
  tilt: 30 * DEG,
  /** The length of each leg of the tripod base. */
  legLength: 0.24,
} as const;

/**
 * Builds a chair: a seat, four legs, two back posts, and two back slats (design 4.5). The seat
 * center is above the origin, and the back is at +z.
 *
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildChair(): MeshData {
  const c = CHAIR;
  const builder = new MeshBuilder();
  const color = SCENE_COLORS.chair;
  const leg = 0.035;
  const x = c.seatWidth / 2 - leg / 2;
  const z = c.seatDepth / 2 - leg / 2;
  builder.add(box(c.seatWidth, 0.04, c.seatDepth), {
    color,
    at: transform([0, c.seatHeight - 0.02, 0]),
  });
  for (const side of [-1, 1]) {
    // A front leg up to the seat, and a back leg that goes on up to the top of the back.
    builder.add(box(leg, c.seatHeight - 0.04, leg), {
      color,
      at: transform([side * x, (c.seatHeight - 0.04) / 2, -z]),
    });
    builder.add(box(leg, c.backTop, leg), { color, at: transform([side * x, c.backTop / 2, z]) });
  }
  for (const height of c.slats) {
    builder.add(box(c.seatWidth - 2 * leg, 0.07, 0.02), { color, at: transform([0, height, z]) });
  }
  return builder.build();
}

/**
 * Builds a music stand: a tripod base, a post, a tilted desk, and a white sheet (design 4.5).
 * The post stands on the origin. The reader is at +z, so the desk faces +z.
 *
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildMusicStand(): MeshData {
  const s = MUSIC_STAND;
  const builder = new MeshBuilder();
  const color = SCENE_COLORS.stand;
  for (let i = 0; i < 3; i++) {
    const turn = axisAngle([0, 1, 0], (i * 120 + 60) * DEG);
    const out = rotate(turn, [0, 0, s.legLength / 2]);
    // Each leg leans 20° down from the post to the floor.
    const lean = axisAngle(rotate(turn, [1, 0, 0]), 20 * DEG);
    builder.add(box(0.015, 0.015, s.legLength), {
      color,
      at: transform(add(out, [0, 0.05, 0]), multiply(lean, turn)),
    });
  }
  builder.add(box(0.02, s.deskHeight, 0.02), { color, at: transform([0, s.deskHeight / 2, 0]) });
  // The desk is a vertical plate that leans back by the tilt, so that its face points to the reader.
  const tilt = axisAngle([1, 0, 0], -s.tilt);
  const deskCenter: Vec3 = [0, s.deskHeight, 0];
  builder.add(box(s.deskWidth, s.deskDepth, 0.012), { color, at: transform(deskCenter, tilt) });
  // The sheet is one quad a little in front of the desk.
  const w = s.deskWidth / 2 - 0.04;
  const d = s.deskDepth / 2 - 0.04;
  const front = 0.0075;
  const corner = (cx: number, cy: number): Vec3 => add(deskCenter, rotate(tilt, [cx, cy, front]));
  builder.add(quad(corner(-w, -d), corner(w, -d), corner(w, d), corner(-w, d)), {
    color: SCENE_COLORS.sheet,
  });
  return builder.build();
}

import { SCENE_COLORS } from './colors.ts';
import { DEG, add, axisAngle, multiply, rotate, transform } from './math.ts';
import { buildPianoBench } from './instruments/piano.ts';
import type { Vec3 } from './math.ts';
import { centeredBox } from './bounds.ts';
import type { Bounds } from './bounds.ts';
import type { RiserLevel } from './layout.ts';
import { MeshBuilder } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { box, quad } from './primitives.ts';

/**
 * The item that a player sits or stands on (design 5.1). `stand` is the floor or the podium, and
 * `riser` is a level of the choir risers.
 */
export type Support = 'chair' | 'stool' | 'high-stool' | 'bench' | 'stand' | 'riser';

/** The chair (design 4.5, props). The player sits on it and faces -z. */
export const CHAIR = {
  seatHeight: 0.45,
  seatWidth: 0.42,
  seatDepth: 0.4,
  backTop: 0.95,
  /** The heights of the two horizontal back slats. */
  slats: [0.66, 0.86],
} as const;

/** The stool of the harp (design 4.5, props): the seat height of a chair, with no back. */
export const STOOL = {
  seatHeight: 0.45,
  seatSize: 0.36,
} as const;

/**
 * The high stool of the contrabass (design 4.5, props). The feet rest on a ring between the
 * legs, so that the shin keeps the length that it has on a chair.
 */
export const HIGH_STOOL = {
  seatHeight: 0.7,
  seatSize: 0.36,
  footRing: 0.25,
} as const;

/** The depth of each level of the choir risers, and the rise of each level (design 4.5). */
export const RISER = {
  depth: 0.8,
  rise: 0.25,
  /** The most levels. */
  levels: 3,
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

/** The width of the legs and of the back posts of the chair. */
const CHAIR_LEG = 0.035;

/**
 * The boxes of the chair back: the two back legs, which go on up to the top of the back, and the
 * two horizontal slats (design 4.5). The seat center is above the origin, and the back is at +z.
 */
export const CHAIR_BACK: readonly Bounds[] = (() => {
  const c = CHAIR;
  const x = c.seatWidth / 2 - CHAIR_LEG / 2;
  const z = c.seatDepth / 2 - CHAIR_LEG / 2;
  return [
    ...[-x, x].map((px) => centeredBox([px, c.backTop / 2, z], [CHAIR_LEG, c.backTop, CHAIR_LEG])),
    ...c.slats.map((height) =>
      centeredBox([0, height, z], [c.seatWidth - 2 * CHAIR_LEG, 0.07, 0.02]),
    ),
  ];
})();

/**
 * Adds a box part to a mesh.
 *
 * @param builder The mesh.
 * @param part The box.
 * @param color The color.
 */
function addBox(builder: MeshBuilder, part: Bounds, color: Rgb): void {
  const { min, max } = part;
  builder.add(box(max[0] - min[0], max[1] - min[1], max[2] - min[2]), {
    color,
    at: transform([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]),
  });
}

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
  const x = c.seatWidth / 2 - CHAIR_LEG / 2;
  const z = c.seatDepth / 2 - CHAIR_LEG / 2;
  addBox(
    builder,
    centeredBox([0, c.seatHeight - 0.02, 0], [c.seatWidth, 0.04, c.seatDepth]),
    color,
  );
  for (const side of [-1, 1]) {
    // A front leg up to the seat. The back legs are the posts of the back.
    const legHeight = c.seatHeight - 0.04;
    addBox(
      builder,
      centeredBox([side * x, legHeight / 2, -z], [CHAIR_LEG, legHeight, CHAIR_LEG]),
      color,
    );
  }
  for (const part of CHAIR_BACK) {
    addBox(builder, part, color);
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

/**
 * Builds a stool with four legs and no back: the stool of the harp, or the high stool of the
 * contrabass with its foot ring (design 4.5). The seat center is above the origin.
 *
 * @param high True for the high stool.
 * @returns The mesh data, with all vertices on bone 0.
 */
export function buildStool(high: boolean): MeshData {
  const { seatHeight, seatSize } = high ? HIGH_STOOL : STOOL;
  const builder = new MeshBuilder();
  const color = SCENE_COLORS.chair;
  addBox(builder, centeredBox([0, seatHeight - 0.02, 0], [seatSize, 0.04, seatSize]), color);
  const legHeight = seatHeight - 0.04;
  const at = seatSize / 2 - CHAIR_LEG / 2;
  for (const x of [-at, at]) {
    for (const z of [-at, at]) {
      addBox(builder, centeredBox([x, legHeight / 2, z], [CHAIR_LEG, legHeight, CHAIR_LEG]), color);
    }
  }
  if (high) {
    // The foot ring: four rails between the legs, with their tops at the height of the ring.
    const rail = seatSize - 2 * CHAIR_LEG;
    const y = HIGH_STOOL.footRing - 0.0125;
    for (const side of [-at, at]) {
      addBox(builder, centeredBox([0, y, side], [rail, 0.025, 0.025]), color);
      addBox(builder, centeredBox([side, y, 0], [0.025, 0.025, rail]), color);
    }
  }
  return builder.build();
}

/**
 * Builds the seat of a player: the chair, a stool, the high stool, or the piano bench. The seat
 * center is above the origin, and the player sits on it and faces -z.
 *
 * @param support The support of the player.
 * @returns The mesh data, or `null` for a standing player.
 */
export function buildSupport(support: Support): MeshData | null {
  switch (support) {
    case 'chair':
      return buildChair();
    case 'stool':
      return buildStool(false);
    case 'high-stool':
      return buildStool(true);
    case 'bench':
      return buildPianoBench();
    case 'stand':
    case 'riser':
      return null;
    default: {
      const unhandled: never = support;
      throw new Error(`The support "${String(unhandled)}" is not known.`);
    }
  }
}

/** The largest angle of one face of a riser arc. */
const RISER_FACET = 5 * DEG;

/**
 * Builds the choir risers: one arc block for each level, from the stage top to the height of the
 * level (design 4.5). The tops have the color of the stage top, and the sides the color of the
 * stage sides, as on the steps.
 *
 * @param levels The levels of the layout.
 * @param podium The podium center, the center of the arcs.
 * @returns The mesh data in the stage axes, with all vertices on bone 0.
 */
export function buildRisers(levels: readonly RiserLevel[], podium: Vec3): MeshData {
  const builder = new MeshBuilder();
  for (const { radius, height, halfAngle } of levels) {
    const point = (r: number, angle: number, y: number): Vec3 => [
      podium[0] + r * Math.sin(angle),
      podium[1] + y,
      podium[2] - r * Math.cos(angle),
    ];
    const inner = radius - RISER.depth / 2;
    const outer = radius + RISER.depth / 2;
    const segments = Math.max(1, Math.ceil((2 * halfAngle) / RISER_FACET));
    const top: number[] = [];
    const sides: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a0 = -halfAngle + (2 * halfAngle * i) / segments;
      const a1 = -halfAngle + (2 * halfAngle * (i + 1)) / segments;
      top.push(
        ...quad(
          point(inner, a0, height),
          point(inner, a1, height),
          point(outer, a1, height),
          point(outer, a0, height),
        ),
      );
      sides.push(
        ...quad(
          point(inner, a0, 0),
          point(inner, a1, 0),
          point(inner, a1, height),
          point(inner, a0, height),
        ),
        ...quad(
          point(outer, a0, 0),
          point(outer, a0, height),
          point(outer, a1, height),
          point(outer, a1, 0),
        ),
      );
    }
    sides.push(
      ...quad(
        point(inner, -halfAngle, 0),
        point(inner, -halfAngle, height),
        point(outer, -halfAngle, height),
        point(outer, -halfAngle, 0),
      ),
      ...quad(
        point(inner, halfAngle, 0),
        point(outer, halfAngle, 0),
        point(outer, halfAngle, height),
        point(inner, halfAngle, height),
      ),
    );
    builder.add(top, { color: SCENE_COLORS.stageTop });
    builder.add(sides, { color: SCENE_COLORS.stageSide });
  }
  return builder.build();
}

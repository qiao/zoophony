import { MathUtils, Quaternion, Vector3 } from 'three';
import { SCENE_COLORS } from './colors.ts';
import { toQuat, toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { MeshBuilder, transform } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { box, cylinder, quad } from './primitives.ts';
import { STAGE_COLORS, addDesk } from './props.ts';

/** The thickness of the stage slab (design 4.5, props). The floor is at y = -STAGE_THICKNESS. */
export const STAGE_THICKNESS = 0.4;

/**
 * The width of one plank of the stage top. The planks run from the left to the right, as in
 * `mockup.png`, and each row has planks of several lengths with staggered joints.
 */
export const PLANK_WIDTH = 0.22;

/** The width of the dark line between two planks. */
export const PLANK_LINE_WIDTH = 0.012;

/** The shortest plank and the length that a plank can add to it, in meters. */
export const PLANK_LENGTH = { min: 2.4, extra: 2.4 } as const;

/** The largest change of the tone of one plank from the mean plank color, as a factor. */
export const PLANK_TONE = 0.2;

/**
 * The edge of the stage top: a chamfer of this size at the four edges, which catches the light as
 * the lip of the stage in `mockup.png`.
 */
export const STAGE_EDGE = 0.04;

/** The panels of the skirt (the sides of the stage): a panel width and a groove between panels. */
export const SKIRT = { panel: 0.5, groove: 0.03 } as const;

/**
 * The front distance `F` from the front edge of the stage to the podium center, with no piano
 * (design 4.5, stage origin).
 */
export const PODIUM_FROM_FRONT = 1.0;

/** The podium box: width, height, and depth (design 4.5, props). */
export const PODIUM_SIZE: Vec3 = [0.9, 0.25, 0.9];

/** The thickness of the lighter top plate of the podium. */
export const PODIUM_PLATE = 0.04;

/** The conductor stand on the podium (design 4.5, props). */
export const CONDUCTOR_STAND = {
  deskWidth: 0.6,
  deskDepth: 0.45,
  /**
   * The height of the desk center above the top of the podium: just below the chest of the bear,
   * so that the top edge of the desk is at its shoulders. With 1.10 m, the desk was above the
   * shoulders of the bear, and the beat had to stay at the height of its head (UX audit
   * 2026-10-05, AM1). With 0.80 m, the head of the bear went into the top of the desk in the bow
   * at the song end.
   */
  deskHeight: 0.7,
  /** The tilt of the desk toward the conductor, as for a music stand. */
  tilt: 30 * MathUtils.DEG2RAD,
  /**
   * The distance of the post in front of the podium center, toward the orchestra (-z). The stand
   * stands on the stage, just in front of the podium. At 0.35 m on the podium, the lower edge of
   * the desk was 0.24 m in front of the bear, and the belly of the bear (0.36 m) went through the
   * desk and the score.
   */
  forward: 0.6,
  /** The radius of the round base of the post. */
  baseRadius: 0.12,
} as const;

/**
 * Gives a number from 0 to 1 for two whole numbers, with no state, so that the planks of a stage
 * are the same on each build.
 *
 * @param a The first number.
 * @param b The second number.
 * @returns The number.
 */
export function plankHash(a: number, b: number): number {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * Gives the color of one plank: the mean plank color, lighter or darker by up to
 * {@link PLANK_TONE}.
 *
 * @param row The row of the plank, from the back.
 * @param index The plank in its row, from the left.
 * @returns The linear color.
 */
export function plankColor(row: number, index: number): Rgb {
  const tone = 1 + PLANK_TONE * (2 * plankHash(row, index) - 1);
  const [r, g, b] = STAGE_COLORS.plank;
  return [r * tone, g * tone, b * tone];
}

function addQuadXZ(
  builder: MeshBuilder,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  color: Rgb,
): void {
  builder.add(quad([x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0]), { color });
}

/**
 * Adds one side of the skirt: panels with grooves between them, from the floor to the chamfer.
 * The side runs from `from` to `to` on the floor, and its face points out of the stage.
 */
function addSkirt(builder: MeshBuilder, from: Vec3, to: Vec3): void {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const at = (d: number, y: number): Vec3 => [
    from[0] + ((to[0] - from[0]) * d) / length,
    y,
    from[2] + ((to[2] - from[2]) * d) / length,
  ];
  const bottom = -STAGE_THICKNESS;
  const top = -STAGE_EDGE;
  const step = SKIRT.panel + SKIRT.groove;
  for (let d = 0; d < length - 1e-9; d += step) {
    const panelEnd = Math.min(d + SKIRT.panel, length);
    builder.add(quad(at(d, bottom), at(panelEnd, bottom), at(panelEnd, top), at(d, top)), {
      color: STAGE_COLORS.skirt,
    });
    const grooveEnd = Math.min(d + step, length);
    if (grooveEnd > panelEnd) {
      builder.add(
        quad(at(panelEnd, bottom), at(grooveEnd, bottom), at(grooveEnd, top), at(panelEnd, top)),
        { color: STAGE_COLORS.groove },
      );
    }
  }
}

function addSlab(builder: MeshBuilder, side: number): void {
  const h = side / 2;
  const y = -STAGE_THICKNESS;
  const e = STAGE_EDGE;
  // The skirt on the four sides, each seen from outside, and the bottom.
  addSkirt(builder, [-h, y, h], [h, y, h]);
  addSkirt(builder, [h, y, h], [h, y, -h]);
  addSkirt(builder, [h, y, -h], [-h, y, -h]);
  addSkirt(builder, [-h, y, -h], [-h, y, h]);
  builder.add(quad([-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]), { color: STAGE_COLORS.skirt });
  // The chamfer of the four edges, mitered at the corners.
  const color = STAGE_COLORS.nosing;
  builder.add(quad([-h, -e, h], [h, -e, h], [h - e, 0, h - e], [-h + e, 0, h - e]), { color });
  builder.add(quad([h, -e, h], [h, -e, -h], [h - e, 0, -h + e], [h - e, 0, h - e]), { color });
  builder.add(quad([h, -e, -h], [-h, -e, -h], [-h + e, 0, -h + e], [h - e, 0, -h + e]), {
    color,
  });
  builder.add(quad([-h, -e, -h], [-h, -e, h], [-h + e, 0, h - e], [-h + e, 0, -h + e]), {
    color,
  });
}

/**
 * Adds the planks of the stage top inside the chamfer: rows from the back to the front, and in
 * each row planks of several lengths from the left to the right, with dark lines between them.
 */
function addPlanks(builder: MeshBuilder, side: number): void {
  const inner = side / 2 - STAGE_EDGE;
  const half = PLANK_LINE_WIDTH / 2;
  const rows = Math.ceil((2 * inner) / PLANK_WIDTH - 1e-9);
  for (let row = 0; row < rows; row++) {
    const z0 = -inner + row * PLANK_WIDTH;
    const z1 = Math.min(z0 + PLANK_WIDTH, inner);
    const isLast = row === rows - 1;
    const plankZ0 = row === 0 ? z0 : z0 + half;
    const plankZ1 = isLast ? z1 : z1 - half;
    if (!isLast) {
      addQuadXZ(builder, -inner, inner, plankZ1, z1 + half, STAGE_COLORS.seam);
    }
    // The first plank of a row starts at a staggered place, before the left edge.
    let x0 = -inner - plankHash(row, -1) * (PLANK_LENGTH.min + PLANK_LENGTH.extra);
    for (let index = 0; x0 < inner - 1e-9; index++) {
      const x1 = x0 + PLANK_LENGTH.min + PLANK_LENGTH.extra * plankHash(row, index);
      const left = Math.max(x0, -inner);
      const right = Math.min(x1, inner);
      const plankLeft = x0 <= -inner ? left : left + half;
      const plankRight = x1 >= inner ? right : right - half;
      if (plankRight > plankLeft) {
        addQuadXZ(builder, plankLeft, plankRight, plankZ0, plankZ1, plankColor(row, index));
      }
      if (x1 < inner) {
        addQuadXZ(builder, plankRight, x1 + half, plankZ0, plankZ1, STAGE_COLORS.seam);
      }
      x0 = x1;
    }
  }
}

function addPodium(builder: MeshBuilder, podium: Vec3): void {
  const [px, , pz] = podium;
  const [w, h, d] = PODIUM_SIZE;
  // A solid wooden box with a top plate, as in `mockup.png`.
  const plate = PODIUM_PLATE;
  builder.add(box(w, h - plate, d), {
    color: STAGE_COLORS.podium,
    at: transform([px, (h - plate) / 2, pz]),
  });
  builder.add(box(w, plate, d), {
    color: STAGE_COLORS.podiumTop,
    at: transform([px, h - plate / 2, pz]),
  });

  // The stand stands on the stage in front of the podium, and its desk is below the chest of the bear.
  const stand = CONDUCTOR_STAND;
  const top = h;
  const z = pz - stand.forward;
  const color = SCENE_COLORS.stand;
  const post = top + stand.deskHeight;
  builder.add(cylinder(stand.baseRadius, stand.baseRadius, 0.02, 6), {
    color,
    at: transform([px, 0, z]),
  });
  builder.add(box(0.025, post, 0.025), { color, at: transform([px, post / 2, z]) });
  // The desk is a vertical plate that leans back by the tilt, so its face points to the conductor.
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -stand.tilt);
  const deskCenter = new Vector3(px, top + stand.deskHeight, z);
  addDesk(
    builder,
    box(stand.deskWidth, stand.deskDepth, 0.015),
    transform(toVec3(deskCenter), toQuat(tilt)),
  );
  // The open score: two pages with a small gap, on the front face of the desk.
  const lift = new Vector3(0, 0, 0.0095).applyQuaternion(tilt);
  for (const sign of [-1, 1]) {
    const page = box(stand.deskWidth / 2 - 0.03, stand.deskDepth - 0.06, 0.004);
    const center = new Vector3((sign * stand.deskWidth) / 4, 0, 0).add(lift).add(deskCenter);
    builder.add(page, {
      color: SCENE_COLORS.sheet,
      at: transform(toVec3(center), toQuat(tilt)),
    });
  }
}

/**
 * Builds the static mesh of the stage: the skirt, the chamfered edge, the planks, the podium, and
 * the conductor stand (design 4.4, 4.5). The stage has no steps, as in `mockup.png` and
 * `scene.png`. The world origin is the stage center on the top of the
 * stage, and +z points to the audience.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center of the layout, or `null` for a chamber group, which has no
 *   podium (design 4.2). The podium is 1.0 m behind the front edge, or further with a soloist
 *   (design 4.5, stage origin).
 * @returns The mesh data. All vertices follow bone 0.
 */
export function buildStage(stageSide: number, podium: Vec3 | null): MeshData {
  const builder = new MeshBuilder();
  addSlab(builder, stageSide);
  addPlanks(builder, stageSide);
  if (podium) {
    addPodium(builder, podium);
  }
  return builder.build();
}

/**
 * Builds the podium with the conductor stand on it (design 4.5, props), for a view of the
 * conductor alone. The podium center is on the origin, and its bottom is at y = 0.
 *
 * @returns The mesh data. All vertices follow bone 0.
 */
export function buildPodium(): MeshData {
  const builder = new MeshBuilder();
  addPodium(builder, [0, 0, 0]);
  return builder.build();
}

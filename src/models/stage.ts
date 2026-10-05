import { SCENE_COLORS } from './colors.ts';
import { DEG, add, axisAngle, rotate, transform } from './math.ts';
import type { Vec3 } from './math.ts';
import { MeshBuilder, splitByFacing } from './mesh.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { box, cylinder, quad } from './primitives.ts';

/** The thickness of the stage slab (design 4.5, props). The floor is at y = -STAGE_THICKNESS. */
export const STAGE_THICKNESS = 0.4;

/** The width of one plank of the stage top. The planks run from the front to the back. */
export const PLANK_WIDTH = 0.2;

/** The width of the dark line between two planks. */
export const PLANK_LINE_WIDTH = 0.012;

/**
 * The front distance `F` from the front edge of the stage to the podium center, with no piano
 * (design 4.5, stage origin).
 */
export const PODIUM_FROM_FRONT = 1.0;

/** The podium box: width, height, and depth (design 4.5, props). */
export const PODIUM_SIZE: Vec3 = [0.9, 0.25, 0.9];

/**
 * The steps at the front edge (design 4.5, props): three treads below the stage top, as in the
 * reference image. The treads have the color of the stage top.
 */
export const STEPS = {
  count: 3,
  rise: 0.1,
  tread: 0.3,
  width: 1.0,
  /** The distance of the step center to the left of the podium center. */
  leftOfPodium: 0.4,
} as const;

/** The conductor stand on the podium (design 4.5, props). */
export const CONDUCTOR_STAND = {
  deskWidth: 0.6,
  deskDepth: 0.45,
  /** The height of the desk center above the top of the podium. */
  deskHeight: 1.1,
  /** The tilt of the desk toward the conductor, as for a music stand. */
  tilt: 30 * DEG,
  /** The distance of the post in front of the podium center, toward the orchestra (-z). */
  forward: 0.35,
} as const;

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

function addSlab(builder: MeshBuilder, side: number): void {
  const h = side / 2;
  const y = -STAGE_THICKNESS;
  // The four sides and the bottom. The planks make the top.
  const faces = [
    quad([-h, y, h], [h, y, h], [h, 0, h], [-h, 0, h]),
    quad([h, y, -h], [-h, y, -h], [-h, 0, -h], [h, 0, -h]),
    quad([h, y, h], [h, y, -h], [h, 0, -h], [h, 0, h]),
    quad([-h, y, -h], [-h, y, h], [-h, 0, h], [-h, 0, -h]),
    quad([-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]),
  ];
  builder.add(faces.flat(), { color: SCENE_COLORS.stageSide });
}

function addPlanks(builder: MeshBuilder, side: number): void {
  const h = side / 2;
  const half = PLANK_LINE_WIDTH / 2;
  for (let left = -h; left < h - 1e-9; left += PLANK_WIDTH) {
    const right = Math.min(left + PLANK_WIDTH, h);
    const isFirst = left === -h;
    const isLast = right === h;
    const plankLeft = isFirst ? left : left + half;
    const plankRight = isLast ? right : right - half;
    addQuadXZ(builder, plankLeft, plankRight, -h, h, SCENE_COLORS.stageTop);
    if (!isLast) {
      addQuadXZ(builder, plankRight, right + half, -h, h, SCENE_COLORS.plankLine);
    }
  }
}

function addSteps(builder: MeshBuilder, side: number, podium: Vec3): void {
  const x = podium[0] - STEPS.leftOfPodium;
  for (let k = 0; k < STEPS.count; k++) {
    const top = -STEPS.rise * (k + 1);
    const height = STAGE_THICKNESS + top;
    const z = side / 2 + STEPS.tread * (k + 0.5);
    // The tread has the color of the stage top, as in the reference image. The rise is dark.
    const [tread, rise] = splitByFacing(box(STEPS.width, height, STEPS.tread), [0, 1, 0], 0.99);
    const at = transform([x, -STAGE_THICKNESS + height / 2, z]);
    builder.add(tread, { color: SCENE_COLORS.stageTop, at });
    builder.add(rise, { color: SCENE_COLORS.stageSide, at });
  }
}

function addPodium(builder: MeshBuilder, podium: Vec3): void {
  const [px, , pz] = podium;
  const [w, h, d] = PODIUM_SIZE;
  builder.add(box(w, h, d), { color: SCENE_COLORS.podium, at: transform([px, h / 2, pz]) });

  const stand = CONDUCTOR_STAND;
  const top = h;
  const z = pz - stand.forward;
  const color = SCENE_COLORS.stand;
  builder.add(cylinder(0.12, 0.12, 0.02, 6), { color, at: transform([px, top, z]) });
  builder.add(box(0.025, stand.deskHeight, 0.025), {
    color,
    at: transform([px, top + stand.deskHeight / 2, z]),
  });
  // The desk is a vertical plate that leans back by the tilt, so its face points to the conductor.
  const tilt = axisAngle([1, 0, 0], -stand.tilt);
  const deskCenter: Vec3 = [px, top + stand.deskHeight, z];
  builder.add(box(stand.deskWidth, stand.deskDepth, 0.015), {
    color,
    at: transform(deskCenter, tilt),
  });
  // The open score: two pages with a small gap, on the front face of the desk.
  const lift = rotate(tilt, [0, 0, 0.0095]);
  for (const sign of [-1, 1]) {
    const page = box(stand.deskWidth / 2 - 0.03, stand.deskDepth - 0.06, 0.004);
    builder.add(page, {
      color: SCENE_COLORS.sheet,
      at: transform(add(deskCenter, add(lift, [(sign * stand.deskWidth) / 4, 0, 0])), tilt),
    });
  }
}

/**
 * Builds the static mesh of the stage: the slab, the planks, the steps, the podium, and the
 * conductor stand (design 4.4, 4.5). The world origin is the stage center on the top of the
 * stage, and +z points to the audience.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param podium The podium center of the layout. It is 1.0 m behind the front edge, or further
 *   with a piano (design 4.5, stage origin).
 * @returns The mesh data. All vertices follow bone 0.
 */
export function buildStage(stageSide: number, podium: Vec3): MeshData {
  const builder = new MeshBuilder();
  addSlab(builder, stageSide);
  addPlanks(builder, stageSide);
  addSteps(builder, stageSide, podium);
  addPodium(builder, podium);
  return builder.build();
}

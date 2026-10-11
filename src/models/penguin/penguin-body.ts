import type { BodyBones } from '../biped.ts';
import type { Stance } from '../body-frame.ts';
import { bodyColors } from '../body-parts.ts';
import type { BodyColors } from '../body-parts.ts';
import type { MeshBuilder, Rgb } from '../mesh.ts';
import { addPainted, jitter } from '../painted.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import { proportionsOf } from '../proportions.ts';
import type { SpeciesParams } from '../species.ts';
import { addFace, addFeet, addFlippers } from './penguin-parts.ts';
import type { PenguinPlace } from './penguin-parts.ts';

/**
 * One ring of the egg of the penguin, in head heights `H` (design 4.5): the height above the
 * soles, the half width, and the depth of the front and of the back from the axis of the body.
 */
type EggRow = readonly [y: number, halfWidth: number, front: number, back: number];

/**
 * The rings of the body of the penguin from the bottom point to the throat
 * (`orchestra-latest.png`, `orchestra-side.png`). The body is one tall egg: a full low belly, a
 * slim chest, and no neck. The front is flat above the belly, so that the folder keeps clear of
 * it. The rings above the lower edge of the head are inside the head, so that a lift of the head
 * shows the throat and no hole (`docs/research/2026-10-11-penguin-body.md`).
 */
const BODY_ROWS: readonly EggRow[] = [
  [0.1, 0, 0, 0],
  [0.17, 0.36, 0.32, 0.33],
  [0.32, 0.51, 0.46, 0.47],
  [0.58, 0.575, 0.5, 0.52],
  [0.88, 0.585, 0.49, 0.525],
  [1.22, 0.565, 0.465, 0.51],
  [1.55, 0.525, 0.445, 0.49],
  [1.9, 0.475, 0.42, 0.465],
  [2.2, 0.425, 0.39, 0.43],
  [2.4, 0.395, 0.375, 0.39],
  [2.52, 0.365, 0.345, 0.36],
  [2.64, 0.3, 0.285, 0.295],
  [2.72, 0, 0, 0],
];

/**
 * The rings of the head of the penguin, from its lower edge to the crown: the top of the egg. The
 * lower edge is a little wider than the throat under it, so that the head covers the joint.
 */
const HEAD_ROWS: readonly EggRow[] = [
  [2.37, 0.405, 0.39, 0.405],
  [2.55, 0.395, 0.39, 0.395],
  [2.72, 0.375, 0.375, 0.375],
  [2.86, 0.33, 0.33, 0.335],
  [2.96, 0.25, 0.25, 0.26],
  [3.02, 0.15, 0.15, 0.16],
  [3.05, 0, 0, 0],
];

/** The number of corners of each ring of the egg. */
const EGG_SEGMENTS = 14;

/** The largest radial offset of a corner of the egg, as a part of its radius. */
const EGG_JITTER = 0.04;

/** The scale of the inner ring of each body part past the split at the chest bone. */
const BODY_INSET = 0.97;

/**
 * The heights of the bones of the trunk above the soles, in H (design 4.7). The chest bone is
 * 1 H below the head center, behind the folder, as on the other bodies: the shots of the choir
 * read it as the place of the folder (design 5.6). The body splits there, and the folder hides
 * the split. The neck and the head bones are in the middle of the throat, at the lower edge of
 * the head, so that a lift of the head turns the head around the throat.
 */
const BONES = {
  hips: 0.5,
  spine: 1.0,
  chest: 1.55,
  neck: 2.36,
  head: 2.4,
} as const;

/** The head center above the soles, in H: 0.5 H below the crown, as on the other bodies. */
export const PENGUIN_HEAD_CENTER = 2.55;

/**
 * The white front of the penguin (design 4.5): the top under the beak, and the largest angle of
 * the white from the front at a height. The white is a shield under the beak, and it reaches to
 * the sides of the belly.
 */
export const PENGUIN_FRONT = {
  /** The top of the white, in H above the soles: just under the beak. */
  top: 2.58,
  /** The largest angle from the front at a height: the height in H, and the angle in degrees. */
  angles: [
    [0, 88],
    [0.6, 84],
    [1.3, 74],
    [2, 62],
    [2.58, 52],
  ],
} as const satisfies {
  readonly top: number;
  readonly angles: readonly (readonly [number, number])[];
};

/**
 * Builds the body of the penguin in its bind pose, and adds its parts to a mesh (design 4.3,
 * 4.4): one tall egg with the head as its top, a black back and crown, a white front from under
 * the beak to the bottom, white eye patches with black eyes, a large orange beak whose lower half
 * opens on the jaw, two black flippers on the arm bones, and two small orange feet. The animal
 * faces -z, its left side is -x, and the floor is at y = 0. Each part follows one bone.
 *
 * A penguin stands on its soles. On a seat, which the cast never gives it, it stands on the seat
 * top, so that each support gives a valid body.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters: the size and the colors of the penguin.
 * @param stance The seat under the body, or no seat.
 * @returns The bind positions of the body bones.
 */
export function buildPenguinBody(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
): BodyBones {
  const h = proportionsOf(species).headHeight;
  const base = stance.kind === 'standing' ? 0 : stance.seatHeight;
  const forward = stance.kind === 'standing' ? 0 : stance.forward;
  const place: PenguinPlace = {
    h,
    at: (x, y, z) => [x * h, base + y * h, z * h - forward],
  };
  const colors = bodyColors(species);
  const { at } = place;

  addBody(builder, colors, place);
  const skull = addHead(builder, colors, place);
  const face = addFace(builder, colors, place, skull, at(0, PENGUIN_HEAD_CENTER, 0));
  const flippers = addFlippers(builder, colors, place);
  const feet = addFeet(builder, colors, place);

  return {
    headHeight: h,
    headCenter: at(0, PENGUIN_HEAD_CENTER, 0),
    mouth: face.mouth,
    floor: [0, 0, -forward],
    palmL: flippers.palmL,
    palmR: flippers.palmR,
    fingerBlockL: flippers.fingerBlockL,
    fingerBlockR: flippers.fingerBlockR,
    positions: {
      root: [0, 0, 0],
      hips: at(0, BONES.hips, 0),
      spine: at(0, BONES.spine, 0),
      chest: at(0, BONES.chest, 0),
      neck: at(0, BONES.neck, 0),
      head: at(0, BONES.head, 0),
      jaw: face.jaw,
      eyeL: face.eyeL,
      eyeR: face.eyeR,
      // The penguin has no ears and no tail. The bones keep places in the head and the hips.
      earL: at(-0.25, 2.85, 0),
      earR: at(0.25, 2.85, 0),
      tail1: at(0, 0.4, 0.4),
      tail2: at(0, 0.3, 0.45),
      trunk1: face.mouth,
      trunk2: face.mouth,
      trunk3: face.mouth,
      ...flippers.positions,
      ...feet,
    },
  };
}

/**
 * Gives the corners of one ring of the egg. Every second ring turns by half a step, so that the
 * facets are triangles. The corners of the left half are the mirror images of the corners of the
 * right half, also with their offsets.
 *
 * @param place The axes of the body.
 * @param row The ring.
 * @param index The index of the ring, for the turn and the offsets.
 * @param inset The scale of the radii.
 * @returns The corners, or one corner for a ring with no width.
 */
function eggRing(place: PenguinPlace, row: EggRow, index: number, inset = 1): Ring {
  const [y, halfWidth, front, back] = row;
  if (halfWidth === 0) {
    return [place.at(0, y, 0)];
  }
  const turn = index % 2 === 0 ? 0 : 0.5;
  return Array.from({ length: EGG_SEGMENTS }, (_, i) => {
    const angle = ((i + turn) / EGG_SEGMENTS) * 2 * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const key = Math.round(Math.abs(cos) * 1000) * 3 + Math.round(sin * 1000);
    const scale = (1 + EGG_JITTER * jitter(index + 200, key)) * inset;
    // +sin is the front (-z).
    return place.at(cos * halfWidth * scale, y, -sin * (sin >= 0 ? front : back) * scale);
  });
}

/**
 * Gives the largest angle of the white front from the front at a height, in radians.
 *
 * @param y The height above the soles, in H.
 * @returns The angle, or 0 above the top of the white.
 */
export function frontAngle(y: number): number {
  if (y > PENGUIN_FRONT.top) {
    return 0;
  }
  const points: readonly (readonly [number, number])[] = PENGUIN_FRONT.angles;
  let degrees = points[0]?.[1] ?? 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const [y0, a0] = points[i] ?? [0, 0];
    const [y1, a1] = points[i + 1] ?? [0, 0];
    if (y >= y0) {
      degrees = y >= y1 ? a1 : a0 + ((a1 - a0) * (y - y0)) / (y1 - y0);
    }
  }
  return (degrees * Math.PI) / 180;
}

/**
 * Makes the paint of the egg: the white front and the black back and sides.
 *
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The color of a triangle from its centroid.
 */
function eggPaint(colors: BodyColors, place: PenguinPlace): (centroid: readonly number[]) => Rgb {
  const origin = place.at(0, 0, 0);
  return (centroid) => {
    const x = ((centroid[0] ?? 0) - origin[0]) / place.h;
    const y = ((centroid[1] ?? 0) - origin[1]) / place.h;
    const z = ((centroid[2] ?? 0) - origin[2]) / place.h;
    // The angle from the front (-z) around the axis of the body.
    const angle = Math.abs(Math.atan2(x, -z));
    return angle < frontAngle(y) ? colors.belly : colors.fur;
  };
}

/**
 * Adds the body below the head: the part below the chest bone follows `spine`, and the part
 * above it follows `chest`, with the shoulders and the folder (design 4.7). Each part reaches a
 * ring past the split, inside the other part, so that a turn of the chest shows no gap.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @throws Error if the chest bone is not inside the body.
 */
function addBody(builder: MeshBuilder, colors: BodyColors, place: PenguinPlace): void {
  const split = BODY_ROWS.findIndex(([y]) => y > BONES.chest);
  const below = BODY_ROWS[split - 1];
  const above = BODY_ROWS[split];
  if (!below || !above || below[1] === 0 || above[1] === 0) {
    throw new Error(`The chest bone at ${BONES.chest} H is not inside the body.`);
  }
  const k = (BONES.chest - below[0]) / (above[0] - below[0]);
  const middle: EggRow = [
    BONES.chest,
    below[1] + (above[1] - below[1]) * k,
    below[2] + (above[2] - below[2]) * k,
    below[3] + (above[3] - below[3]) * k,
  ];
  const rows = [...BODY_ROWS.slice(0, split), middle, ...BODY_ROWS.slice(split)];
  const rings = rows.map((row, j) => eggRing(place, row, j));
  const paint = eggPaint(colors, place);
  addPainted(
    builder,
    ringLoft([
      ...rings.slice(0, split + 1),
      eggRing(place, above, split + 1, BODY_INSET),
      [place.at(0, above[0], 0)],
    ]),
    'spine',
    paint,
  );
  addPainted(
    builder,
    ringLoft([
      [place.at(0, below[0], 0)],
      eggRing(place, below, split - 1, BODY_INSET),
      ...rings.slice(split),
    ]),
    'chest',
    paint,
  );
}

/**
 * Adds the head: the top of the egg on the `head` bone, black, with the white of the chin under
 * the beak.
 *
 * @param builder The mesh that gets the part.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The corner list of the head, for the eye patches.
 */
function addHead(builder: MeshBuilder, colors: BodyColors, place: PenguinPlace): number[] {
  const skull = ringLoft(HEAD_ROWS.map((row, j) => eggRing(place, row, j + 50)));
  addPainted(builder, skull, 'head', eggPaint(colors, place));
  return skull;
}

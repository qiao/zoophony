import type { BodyBones } from '../biped.ts';
import type { Stance } from '../body-frame.ts';
import { bodyColors } from '../body-parts.ts';
import type { BodyColors } from '../body-parts.ts';
import { srgb } from '../mesh.ts';
import type { MeshBuilder, Rgb } from '../mesh.ts';
import { addPainted, jitter } from '../painted.ts';
import { ringLoft } from '../primitives.ts';
import type { Ring } from '../primitives.ts';
import { proportionsOf } from '../proportions.ts';
import type { SpeciesParams } from '../species.ts';
import { MOUTH_AREA, MOUTH_COLOR, addFace, addFeet, addFlippers } from './penguin-parts.ts';
import type { PenguinPlace } from './penguin-parts.ts';

/**
 * One ring of the egg of the penguin, in head heights `H` (design 4.5): the height above the
 * soles, the half width, and the depth of the front and of the back from the axis of the body.
 */
type EggRow = readonly [y: number, halfWidth: number, front: number, back: number];

/**
 * The rings of the egg of the penguin from the bottom point to the crown (`orchestra-latest.png`,
 * `orchestra-side.png`). The egg is one tall form: a full low belly, a slim chest, no neck, and
 * the head as its top. The front is flat above the belly, so that the folder keeps clear of it.
 * The body and the head share the ring at the lower edge of the head, so that the egg shows no
 * seam there (`docs/research/2026-10-11-penguin-body.md`).
 */
const EGG_ROWS: readonly EggRow[] = [
  [0.1, 0, 0, 0],
  [0.17, 0.36, 0.32, 0.33],
  [0.32, 0.51, 0.46, 0.47],
  [0.58, 0.575, 0.5, 0.52],
  [0.88, 0.585, 0.49, 0.525],
  [1.22, 0.565, 0.465, 0.51],
  [1.55, 0.525, 0.445, 0.49],
  [1.9, 0.475, 0.42, 0.465],
  [2.2, 0.425, 0.39, 0.43],
  [2.4, 0.395, 0.375, 0.405],
  [2.55, 0.395, 0.385, 0.4],
  [2.72, 0.375, 0.375, 0.38],
  [2.86, 0.33, 0.33, 0.335],
  [2.96, 0.25, 0.25, 0.26],
  [3.02, 0.15, 0.15, 0.16],
  [3.05, 0, 0, 0],
];

/**
 * The rings of the throat: the top of the chest part inside the head, above the lower edge of the
 * head. A turn of the head that lifts a part of its lower edge shows the throat, and no hole.
 */
const THROAT_ROWS: readonly EggRow[] = [
  [2.5, 0.35, 0.33, 0.355],
  [2.7, 0.32, 0.3, 0.33],
  [2.85, 0.24, 0.22, 0.25],
  [2.92, 0, 0, 0],
];

/** The lower edge of the head above the soles, in H: the ring that the body and the head share. */
const HEAD_EDGE = 2.4;

/** The number of corners of each ring of the egg. */
const EGG_SEGMENTS = 14;

/** The largest radial offset of a corner of the egg, as a part of its radius. */
const EGG_JITTER = 0.04;

/** The scale of the inner ring of each body part past the split at the chest bone. */
const BODY_INSET = 0.97;

/**
 * The places of the bones of the trunk above the soles, in H (design 4.7). The chest bone is 1 H
 * below the head center, behind the folder, as on the other bodies: the shots of the choir read
 * it as the place of the folder (design 5.6). The body splits there, and the folder hides the
 * split. The neck and the head bones are at the front of the lower edge of the head. Thus a
 * lift of the head when the penguin sings turns its lower edge down into the body, and the egg
 * shows no seam.
 */
const BONES = {
  /** The `hips` bone, low in the belly. */
  hips: 0.5,
  /** The `spine` bone, the pivot of the lean and the sway of the body. */
  spine: 1.0,
  /** The `chest` bone and the split of the body. */
  chest: 1.55,
  /** The `neck` and the `head` bone: the height and the depth, at the front of the throat. */
  neck: [2.4, -0.37],
} as const;

/** The head center above the soles, in H: 0.5 H below the crown, as on the other bodies. */
const HEAD_CENTER = 2.55;

/**
 * The white front of the penguin (design 4.5): the top under the beak, and the largest angle of
 * the white from the front at a height. The white is a shield under the beak, and it reaches to
 * the sides of the belly.
 */
const FRONT = {
  /** The top of the white, in H above the soles: just under the beak. */
  top: 2.6,
  /** The largest angle from the front at a height: the height in H, and the angle in degrees. */
  angles: [
    [0, 88],
    [0.6, 84],
    [1.3, 74],
    [2, 62],
    [2.6, 52],
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

  const skull = addEgg(builder, colors, place);
  const face = addFace(builder, colors, place, skull, at(0, HEAD_CENTER, 0));
  const flippers = addFlippers(builder, colors, place);
  const feet = addFeet(builder, colors, place);

  return {
    headHeight: h,
    headCenter: at(0, HEAD_CENTER, 0),
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
      neck: at(0, BONES.neck[0], BONES.neck[1]),
      head: at(0, BONES.neck[0], BONES.neck[1]),
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
function frontAngle(y: number): number {
  if (y > FRONT.top) {
    return 0;
  }
  const points: readonly (readonly [number, number])[] = FRONT.angles;
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
 * Makes the paint of the egg: the white front, the black back and sides, and the dark area behind
 * the root of the beak.
 *
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The color of a triangle from its centroid.
 */
function eggPaint(colors: BodyColors, place: PenguinPlace): (centroid: readonly number[]) => Rgb {
  const origin = place.at(0, 0, 0);
  const mouth = srgb(MOUTH_COLOR);
  return (centroid) => {
    const x = ((centroid[0] ?? 0) - origin[0]) / place.h;
    const y = ((centroid[1] ?? 0) - origin[1]) / place.h;
    const z = ((centroid[2] ?? 0) - origin[2]) / place.h;
    if (
      z < 0 &&
      Math.abs(x) < MOUTH_AREA.halfWidth &&
      y > MOUTH_AREA.bottom &&
      y < MOUTH_AREA.top
    ) {
      return mouth;
    }
    // The angle from the front (-z) around the axis of the body.
    const angle = Math.abs(Math.atan2(x, -z));
    return angle < frontAngle(y) ? colors.belly : colors.fur;
  };
}

/**
 * Gives the index of the ring of the egg at a height.
 *
 * @param y The height above the soles, in H.
 * @returns The index in {@link EGG_ROWS}.
 * @throws Error if no ring of the egg has the height.
 */
function ringAt(y: number): number {
  const index = EGG_ROWS.findIndex((row) => row[0] === y && row[1] > 0);
  if (index < 0) {
    throw new Error(`The egg has no ring at ${y} H.`);
  }
  return index;
}

/**
 * Adds the egg: the part below the chest bone follows `spine`, the part above it follows `chest`
 * with the shoulders and the folder, and the head follows `head` (design 4.7). The body parts
 * each reach a ring past the split, inside the other part, so that a turn of the chest shows no
 * gap. The chest part goes on as the throat inside the head. The head starts at the ring of the
 * lower edge of the head, which the chest part shares, so that the egg shows no seam.
 *
 * @param builder The mesh that gets the parts.
 * @param colors The colors of the species.
 * @param place The axes of the body.
 * @returns The corner list of the head, for the eye patches.
 */
function addEgg(builder: MeshBuilder, colors: BodyColors, place: PenguinPlace): number[] {
  const rings = EGG_ROWS.map((row, j) => eggRing(place, row, j));
  const throat = THROAT_ROWS.map((row, j) => eggRing(place, row, j + 100));
  const split = ringAt(BONES.chest);
  const edge = ringAt(HEAD_EDGE);
  const ring = (index: number): Ring => rings[index] ?? [];
  const row = (index: number): EggRow => EGG_ROWS[index] ?? [0, 0, 0, 0];
  const paint = eggPaint(colors, place);

  addPainted(
    builder,
    ringLoft([
      ...rings.slice(0, split + 1),
      eggRing(place, row(split + 1), split + 1, BODY_INSET),
      [place.at(0, row(split + 1)[0], 0)],
    ]),
    'spine',
    paint,
  );
  addPainted(
    builder,
    ringLoft([
      [place.at(0, row(split - 1)[0], 0)],
      eggRing(place, row(split - 1), split - 1, BODY_INSET),
      ...rings.slice(split, edge + 1),
      ...throat,
    ]),
    'chest',
    paint,
  );
  const skull = ringLoft([ring(edge), ...rings.slice(edge + 1)]);
  addPainted(builder, skull, 'head', paint);
  return skull;
}

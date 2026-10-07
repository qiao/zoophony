import { MathUtils } from 'three';
import { SHOULDER_JOINT } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { addEars } from './ears.ts';
import { addEyes } from './eyes.ts';
import { addFacePattern } from './face-patterns.ts';
import { eyePlace, headRings } from './head.ts';
import type { Vec3 } from './tuples.ts';
import { blendSkin, splitByCentroid, splitByFacing, transform } from './mesh.ts';
import type { CornerSkin, MeshBuilder, SkinRule } from './mesh.ts';
import { loft } from './primitives.ts';
import type { LoftRing } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { addSnout } from './snouts.ts';
import { plumpOf } from './species.ts';
import type { SpeciesParams } from './species.ts';

/** The bones that the trunk places: the torso, the neck, the head, and the parts of the head. */
export type TrunkBoneName = Extract<
  BoneName,
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'jaw'
  | 'eyeL'
  | 'eyeR'
  | 'earL'
  | 'earR'
  | 'trunk1'
  | 'trunk2'
  | 'trunk3'
>;

/** The bind positions of the trunk bones, and the points of the head that the instruments need. */
export interface TrunkBones {
  /** The bind position of each trunk bone. */
  readonly positions: Readonly<Record<TrunkBoneName, Vec3>>;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The middle of the mouth, at the front of the snout or the beak (design 4.6). */
  readonly mouth: Vec3;
}

/** The number of corners of each ring of the torso. */
const TORSO_SEGMENTS = 16;

/** The height of the chest bone above the base of the torso, in H. */
const CHEST = 0.75;

/** The height of the base of the neck above the base of the torso, in H. */
const NECK = 1.05;

/**
 * The neck ring of the trunk grid, in H, between the top ring of the torso and the jaw ring of the
 * head (spec 2.5). It is 0.36 H wide on each side ({@link DEFAULT_NECK}), at the height of the
 * head bone, so that a turn of the head moves it little. The chest below it and the jaw above it
 * are wider, so the neck shows only as the fold under the chin. A species can give its own width
 * (`form.neck`), and the depths follow it.
 */
const NECK_RING: LoftRing = { y: 1.3, halfWidth: 0.36, front: 0.4, back: 0.3, turn: 0.5 };

/** The half width of the neck ring of a species with no `form.neck`, in H (spec 2.5). */
export const DEFAULT_NECK = NECK_RING.halfWidth;

/** The smallest half width of the neck ring of a species, in H (spec 4, stage A3). */
export const MIN_NECK = 0.3;

/**
 * The forward bulge of the belly of a species with no `form.belly`, as a factor of the half width
 * (spec 2.4). The belly factors of {@link TORSO_PROFILE} reach it at 0.3 H.
 */
export const DEFAULT_BELLY = 1.16;

/**
 * The lowest ring of the head in the trunk grid, in H from the head center: the jaw ring. The two
 * rings below it (the chin point and the ring of 0.3 H) are inside the neck ring.
 */
const JAW_RING = -0.37;

/**
 * The height above the base of the torso, in H, above which the back and the sides of the torso
 * get the color of accent arms: a band over the shoulders.
 */
const SHOULDER_BAND = 0.9;

/**
 * The height of the head center above the base of the torso, in H. The head top is 0.5 H higher:
 * 2.3 H above the seat, so that the head is 0.30 of the height of a seated rabbit, as in
 * `animals.webp` (design 4.5).
 */
export const HEAD_CENTER = 1.8;

/** The distance of the head center in front of the axis of the torso, in H. */
const HEAD_FORWARD = 0;

/**
 * One ring of the torso profile: the half width and the height, in H, the depth of the front as a
 * factor of the half width, and the share of the plump factor of the species ({@link plumpOf}) on
 * the ring.
 */
type TorsoPoint = readonly [radius: number, y: number, belly: number, plump: number];

/**
 * The profile of the torso of the cute bodies (spec `2026-10-06-cute-furry-spec.md`, 2.4): a
 * round pear from the base to the ring under the chin. The belly bulges forward to 1.16 of the
 * half width (1.08 before). The shoulders are 0.5 to 0.52 H wide from the chest bone to the
 * joints, and the rings above the joints (0.5 and 0.45 H) fill the space under the chin, so that
 * no neck shows. The first rings above the joints were 0.41 and 0.34 H. The plump factor acts in
 * full up to the chest bone and fades out above it, so that a plump body keeps its shoulders
 * inside the domes of the arms.
 */
const TORSO_PROFILE: readonly TorsoPoint[] = [
  [0.34, 0, 1, 1],
  [0.53, 0.05, 1.04, 1],
  [0.62, 0.16, 1.12, 1],
  [0.64, 0.3, 1.16, 1],
  [0.61, 0.45, 1.12, 1],
  [0.55, 0.6, 1.06, 1],
  [0.5, CHEST, 1, 1],
  [0.52, 0.87, 1, 0.75],
  [SHOULDER_JOINT.torsoHalfWidth, SHOULDER_JOINT.height, 1, 0.5],
  [0.5, 1.09, 1, 0.4],
  [0.45, 1.2, 1, 0.3],
];

/** The depth of the back of the torso, as a factor of the half width. The back of 0.85 was too deep. */
const BACK = 0.72;

/**
 * The share of the plump factor on the depth of the torso. A plump body grows more to the sides
 * than to the front: with the full factor on the depth, the belly of the bear came 0.013 m to the
 * stand of the conductor in its bow (limit 0.02 m).
 */
const PLUMP_DEPTH = 0.5;

/** The half width of the blaze of the `cap` face pattern down the middle of the face, in H. */
const CAP_BLAZE = 0.13;

/**
 * The height of the lower edge of the `cap` face pattern below the edge of the lower face, in H.
 * The cap then ends below the eyes.
 */
const CAP_BELOW_FACE = 0.14;

/**
 * The cosine below which a face of the head faces the back. The faces of the lower face that do
 * not face the back get the belly color: the cheeks, the jaw, and the face up to the eyes.
 */
const BACK_FACING = -0.3;

/**
 * Adds the trunk of a body in its bind pose (design 4.5): one grid of the torso, the neck ring,
 * and the head, and the eyes, the ears, the snout, and the face pattern of the head.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @returns The bind positions of the trunk bones, and the points of the head.
 */
export function buildTrunk(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
): TrunkBones {
  const { h, at } = frame;
  const headCenter = at(0, HEAD_CENTER, -HEAD_FORWARD);
  addTrunkGrid(builder, species, colors, frame);

  const [eyeL, eyeR] = addEyes(builder, species, colors, h, headCenter);
  const [earL, earR] = addEars(builder, species, colors, h, headCenter);
  const snout = addSnout(builder, species, colors, h, headCenter);
  addFacePattern(builder, species, colors, h, headCenter);

  return {
    headCenter,
    mouth: snout.mouth,
    positions: {
      hips: at(0, 0.15, 0),
      spine: at(0, 0.45, 0),
      chest: at(0, CHEST, 0),
      neck: at(0, NECK, 0),
      head: at(0, HEAD_CENTER - 0.5, -HEAD_FORWARD),
      jaw: snout.jaw,
      eyeL,
      eyeR,
      earL,
      earR,
      trunk1: snout.trunk[0],
      trunk2: snout.trunk[1],
      trunk3: snout.trunk[2],
    },
  };
}

/**
 * Gives the half angle of the belly stripe of the torso at a height, in radians: 40° at the chest
 * and 20° at the base, so that the stripe narrows down, as on the fox of `animals.webp`. The
 * triangles of the front whose centroids are within the angle get the belly color.
 *
 * @param y The height above the base of the torso, in H.
 * @returns The half angle.
 */
function bellyAngle(y: number): number {
  return (20 + 20 * Math.min(1, y / CHEST)) * MathUtils.DEG2RAD;
}

/** The rings of the trunk grid, from the base of the torso to the crown. */
interface TrunkRings {
  /** The rings, in H from the middle of the base of the torso. */
  readonly rings: LoftRing[];
  /** The bone of each ring. */
  readonly bones: BoneName[];
}

/**
 * The blend bands of the torso (plan 2.3): the middle and the half width of each band, in H above
 * the base of the torso. The waist band blends `hips` into `spine`, so the pelvis stays on the
 * hips, which no pose turns, and the chest band blends `spine` into `chest`.
 */
export const TORSO_BLENDS = {
  waist: { middle: 0.4, half: 0.15 },
  chest: { middle: CHEST, half: 0.15 },
} as const;

/**
 * Gives the skin of a corner of the torso: below the middle of the two bands, a blend of `hips`
 * and `spine` across the waist band, and above it a blend of `spine` and `chest` across the chest
 * band. The weight of the child bone is a smooth step across its band.
 *
 * @param above The height of the corner above the base of the torso, in H.
 * @returns The skin of the corner.
 */
function torsoSkin(above: number): CornerSkin {
  const { waist, chest } = TORSO_BLENDS;
  const step = (band: { readonly middle: number; readonly half: number }): number =>
    MathUtils.smoothstep(above, band.middle - band.half, band.middle + band.half);

  if (above < (waist.middle + chest.middle) / 2) {
    return blendSkin(boneIndex('hips'), boneIndex('spine'), step(waist));
  }
  return blendSkin(boneIndex('spine'), boneIndex('chest'), step(chest));
}

/**
 * Gives the rings of the trunk grid from the base of the torso to the crown, in H from the middle
 * of the base of the torso, with the bone of each ring: the torso rings of {@link TORSO_PROFILE}
 * times the girth, the neck ring, and the head rings of the species from the jaw ring up.
 *
 * @param species The species parameters.
 * @param girth The girth of the species.
 * @returns The rings, and the bone of each ring.
 */
function trunkRings(species: SpeciesParams, girth: number): TrunkRings {
  // The belly bulges forward between the hips and the chest. A species scales the bulge.
  const bulge = ((species.form?.belly ?? DEFAULT_BELLY) - 1) / (DEFAULT_BELLY - 1);
  const plump = plumpOf(species);
  const torso = TORSO_PROFILE.map(([radius, y, belly, share], i): LoftRing => {
    const halfWidth = radius * girth * (1 + (plump - 1) * share);
    const depth = radius * girth * (1 + (plump - 1) * share * PLUMP_DEPTH);
    return {
      y,
      halfWidth,
      front: (1 + (belly - 1) * bulge) * depth,
      back: BACK * depth,
      turn: ((i + 1) % 2) / 2,
    };
  });
  const head = headRings(species)
    .filter((ring) => ring.y >= JAW_RING)
    .map((ring): LoftRing =>
      Object.assign({}, ring, {
        y: HEAD_CENTER + ring.y,
        z: (ring.z ?? 0) - HEAD_FORWARD,
      }),
    );

  const neckScale = Math.max(MIN_NECK, species.form?.neck ?? DEFAULT_NECK) / DEFAULT_NECK;
  const neck = Object.assign({}, NECK_RING, {
    halfWidth: NECK_RING.halfWidth * neckScale,
    front: NECK_RING.front * neckScale,
    back: NECK_RING.back * neckScale,
  });

  return {
    rings: [...torso, neck, ...head],
    bones: [
      ...torso.map((ring): BoneName => (ring.y < CHEST ? 'spine' : 'chest')),
      'neck',
      ...head.map((): BoneName => 'head'),
    ],
  };
}

/**
 * Adds the trunk grid: one welded loft of 16 sides from the base of the torso through the neck
 * ring to the crown ({@link trunkRings}). The torso is 1.28 H wide at the hips and 1.0 H at the
 * shoulders, times the girth. Every second ring turns by half a side, so that the trunk has small
 * triangle facets, as in `animals.webp`. The corners of the torso blend `hips` and `spine` at
 * the waist and `spine` and `chest` at the chest ({@link torsoSkin}, design 4.7), the neck ring
 * follows `neck`, and the head rings follow `head`. The bands between the rings join the bones
 * with no seam, and the chin folds into the chest with no neck tube.
 *
 * The torso has a stripe of the belly color down the front. The lower face of the head (the
 * cheeks, the jaw, and the face up to the eyes) and the front of the neck get the belly color,
 * and the forehead, the back of the head, and the nape keep the fur color. The `cap` face pattern
 * colors the head in place of this split.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 */
function addTrunkGrid(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
): void {
  const { h, girth, at } = frame;
  const { rings, bones } = trunkRings(species, girth);
  const corners = loft(rings, TORSO_SEGMENTS);

  // The torso corners blend the bones of the waist and the chest band. Each corner above the
  // torso follows the bone of its ring. The skin rule reads the corner after the placement, so it
  // finds the ring by the height of the corner.
  const base = at(0, 0, 0)[1];
  const top = TORSO_PROFILE.at(-1)?.[1] ?? 0;
  const skin: SkinRule = ([, y]) => {
    const above = (y - base) / h;
    if (above <= top + 1e-6) {
      return torsoSkin(above);
    }

    let best = 0;
    for (const [i, ring] of rings.entries()) {
      if (Math.abs(base + ring.y * h - y) < Math.abs(base + (rings[best]?.y ?? 0) * h - y)) {
        best = i;
      }
    }
    const bone = boneIndex(bones[best] ?? 'chest');
    return { bone, blendBone: bone, blendWeight: 0 };
  };
  const place = transform(at(0, 0, 0), undefined, [h, h, h]);

  const [torso, head] = splitByCentroid(corners, ([, y]) => y < NECK_RING.y);
  const armColor = partColor(species, colors, 'arms');
  const [belly, back] = splitByCentroid(
    torso,
    ([x, y, z]) => z < 0 && Math.atan2(Math.abs(x), -z) < bellyAngle(y),
  );
  // With accent arms, a band over the shoulders joins the arms, as on the panda of the polished
  // images.
  const [band, rest] = splitByCentroid(back, ([, y]) => y > SHOULDER_BAND);
  builder.add(belly, { color: colors.belly, skin, at: place });
  builder.add(band, { color: armColor, skin, at: place });
  builder.add(rest, { color: colors.fur, skin, at: place });

  // The head part splits by the height above the head center.
  const { faceTop } = eyePlace(species.snout);
  const [lower, upper] = splitByCentroid(head, ([, y]) => y - HEAD_CENTER < faceTop);
  const [nape, face] = splitByFacing(lower, [0, 0, 1], -BACK_FACING);
  if (species.facePattern === 'cap') {
    // The cap of a beagle: the accent color over the head down to below the eyes, with a blaze
    // of the belly color down the middle of the face.
    const [blaze, other] = splitByCentroid(
      head,
      ([x, , z]) => z + HEAD_FORWARD < 0 && Math.abs(x) < CAP_BLAZE,
    );
    const [cap, white] = splitByCentroid(
      other,
      ([, y]) => y - HEAD_CENTER > faceTop - CAP_BELOW_FACE,
    );
    builder.add([...blaze, ...white], { color: colors.belly, skin, at: place });
    builder.add(cap, { color: partColor(species, colors, 'face-pattern'), skin, at: place });
  } else {
    builder.add(face, { color: colors.belly, skin, at: place });
    builder.add([...upper, ...nape], { color: colors.fur, skin, at: place });
  }
}

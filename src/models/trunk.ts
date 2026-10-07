import { MathUtils } from 'three';
import { SHOULDER_JOINT } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { addLimb, partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import { addEars } from './ears.ts';
import { addEyes } from './eyes.ts';
import { addFacePattern } from './face-patterns.ts';
import { HEAD_CORNERS, LOWER_FACE_TOP } from './head.ts';
import type { Vec3 } from './tuples.ts';
import { splitByCentroid, splitByFacing, transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { loft } from './primitives.ts';
import type { LoftRing } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import { addSnout } from './snouts.ts';
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

/** The height of the torso from its base to its top under the chin, in H (design 4.5). */
export const TORSO_HEIGHT = 1.35;

/** The height of the chest bone above the base of the torso, in H. */
const CHEST = 0.75;

/** The height of the base of the neck above the base of the torso, in H. */
const NECK = 1.05;

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
 * One ring of the torso profile: the half width and the height, in H, and the depth of the front
 * as a factor of the half width. The belly bulges forward to 1.08 of the half width.
 */
type TorsoPoint = readonly [radius: number, y: number, belly: number];

/** The depth of the back of the torso, as a factor of the half width. The back of 0.85 was too deep. */
const BACK = 0.72;

/** The half width of the blaze of the `cap` face pattern down the middle of the face, in H. */
const CAP_BLAZE = 0.13;

/** The height of the lower edge of the `cap` face pattern above the head center, in H. */
const CAP_BOTTOM = -0.14;

/**
 * The cosine below which a face of the head faces the back. The faces of the lower face that do
 * not face the back get the belly color: the cheeks, the jaw, and the face up to the eyes.
 */
const BACK_FACING = -0.3;

/**
 * Adds the trunk of a body in its bind pose (design 4.5): the torso, the neck, and the head with
 * its eyes, ears, snout, and face pattern.
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
  addTorso(builder, species, colors, frame);

  // A short thick neck under the head, and the head. The head is the sculpted head of
  // `animals.webp`: 1.0 H tall and 1.26 H wide at the cheeks. Its top is 2.3 H above the seat, so
  // that it sits on the shoulders.
  addLimb(builder, at(0, NECK, 0), at(0, NECK + 0.45, 0), [0.3 * h, 0.27 * h], colors.fur, 'neck');
  const headCenter = at(0, HEAD_CENTER, -HEAD_FORWARD);
  addHead(builder, species, colors, h, headCenter);

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

/**
 * Adds the torso: a round pear of 16 sides and 13 rings, 1.35 H tall, 1.28 H wide at the hips,
 * and 0.9 H at the shoulders, with the belly forward. Its top is under the chin. Every second
 * ring turns by half a side, so that the torso has small triangle facets, as in `animals.webp`.
 * The part below the chest bone follows `spine`. The part above it follows `chest`, as the
 * shoulders and the arms do (design 4.7). A stripe down the front gets the belly color.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 */
function addTorso(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
): void {
  const { h, girth, at } = frame;
  const armColor = partColor(species, colors, 'arms');
  const torsoParts: readonly [BoneName, readonly TorsoPoint[]][] = [
    [
      'spine',
      [
        [0.34, 0, 1],
        [0.53, 0.05, 1.02],
        [0.62, 0.16, 1.06],
        [0.64, 0.3, 1.08],
        [0.61, 0.45, 1.06],
        [0.55, 0.6, 1.03],
        [0.5, CHEST, 1],
      ],
    ],
    [
      'chest',
      [
        [0.5, CHEST, 1],
        [0.48, 0.87, 1],
        [SHOULDER_JOINT.torsoHalfWidth, SHOULDER_JOINT.height, 1],
        [0.41, 1.09, 1],
        [0.34, 1.2, 1],
        [0.2, 1.29, 1],
        [0, TORSO_HEIGHT, 1],
      ],
    ],
  ];

  // The belly bulges forward between the hips and the chest.
  const torsoRing = ([radius, y, belly]: TorsoPoint, i: number): LoftRing => ({
    y,
    halfWidth: radius,
    front: belly * radius,
    back: BACK * radius,
    turn: ((i + 1) % 2) / 2,
  });
  const torsoPlace = transform(at(0, 0, 0), undefined, [girth * h, h, girth * h]);

  for (const [bone, profile] of torsoParts) {
    const corners = loft(profile.map(torsoRing), TORSO_SEGMENTS);
    const [belly, back] = splitByCentroid(
      corners,
      ([x, y, z]) => z < 0 && Math.atan2(Math.abs(x), -z) < bellyAngle(y),
    );
    // With accent arms, a band over the shoulders joins the arms, as on the panda of the
    // polished images.
    const [band, rest] = splitByCentroid(back, ([, y]) => y > SHOULDER_BAND);
    builder.add(belly, { color: colors.belly, bone: boneIndex(bone), at: torsoPlace });
    builder.add(band, { color: armColor, bone: boneIndex(bone), at: torsoPlace });
    builder.add(rest, { color: colors.fur, bone: boneIndex(bone), at: torsoPlace });
  }
}

/**
 * Adds the head with its colors. The lower face (the cheeks, the jaw, and the face up to the
 * eyes) gets the belly color. The forehead and the back of the head keep the fur color. The
 * `cap` face pattern colors the head in place of this split.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param h The head height, in meters.
 * @param headCenter The center of the head.
 */
function addHead(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  h: number,
  headCenter: Vec3,
): void {
  const headPlace = transform(headCenter, undefined, [h, h, h]);
  const [lower, upper] = splitByCentroid(HEAD_CORNERS, ([, y]) => y < LOWER_FACE_TOP);
  const [nape, face] = splitByFacing(lower, [0, 0, 1], -BACK_FACING);

  if (species.facePattern === 'cap') {
    // The cap of a beagle: the accent color over the head down to below the eyes, with a blaze
    // of the belly color down the middle of the face.
    const [blaze, other] = splitByCentroid(
      HEAD_CORNERS,
      ([x, , z]) => z < 0 && Math.abs(x) < CAP_BLAZE,
    );
    const [cap, white] = splitByCentroid(other, ([, y]) => y > CAP_BOTTOM);
    const capColor = partColor(species, colors, 'face-pattern');
    builder.add([...blaze, ...white], {
      color: colors.belly,
      bone: boneIndex('head'),
      at: headPlace,
    });
    builder.add(cap, { color: capColor, bone: boneIndex('head'), at: headPlace });
  } else {
    builder.add(face, { color: colors.belly, bone: boneIndex('head'), at: headPlace });
    builder.add([...upper, ...nape], { color: colors.fur, bone: boneIndex('head'), at: headPlace });
  }
}

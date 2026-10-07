import { MathUtils } from 'three';
import { bodyFrame, SHOULDER_JOINT, tailBase } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { addLimb, bodyColors, partColor } from './body-parts.ts';
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
import { addTail } from './tails.ts';
import { buildArms } from './arms.ts';
import { buildLegs } from './legs.ts';

/** The bones that the body places. The instrument generators place the other bones. */
export type BodyBoneName = Exclude<
  BoneName,
  'instrument' | 'bow' | 'malletL' | 'malletR' | 'baton' | 'slide'
>;

/** The bind positions of the body bones, and the points that the instruments need. */
export interface BodyBones {
  readonly positions: Readonly<Record<BodyBoneName, Vec3>>;
  /** The head height `H` of the species, in meters (design 4.5, body proportions). */
  readonly headHeight: number;
  /** The center of the head. */
  readonly headCenter: Vec3;
  /** The middle of the mouth, at the front of the snout or the beak (design 4.6). */
  readonly mouth: Vec3;
  /** The point on the floor under the middle of the body. */
  readonly floor: Vec3;
  /** The point in the middle of the palm of each hand. */
  readonly palmL: Vec3;
  readonly palmR: Vec3;
  /** The middle of the finger block of each hand, on its `fingers` bone. */
  readonly fingerBlockL: Vec3;
  readonly fingerBlockR: Vec3;
}

const TORSO_SEGMENTS = 16;

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

/** The half width of the blaze of the `cap` face pattern down the middle of the face, in H. */
const CAP_BLAZE = 0.13;

/** The height of the lower edge of the `cap` face pattern above the head center, in H. */
const CAP_BOTTOM = -0.14;

/**
 * The cosine below which a face of the head faces the back. The faces of the lower face that do
 * not face the back get the belly color: the cheeks, the jaw, and the face up to the eyes.
 */
const BACK_FACING = -0.3;

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

/**
 * Builds the body of the parametric biped in its bind pose, and adds its parts to a mesh (design
 * 4.3, 4.5). The animal faces -z, its left side is -x, and the floor is at y = 0. The arms hang
 * down beside the body. Each part follows one bone (design 4.4).
 *
 * A standing body has short straight legs: the base of its torso is `STANDING_BASE` of
 * `body-frame.ts` above the floor, and its thigh is `STANDING_THIGH` of `legs.ts` long.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param stance The seat under the body, or no seat.
 * @returns The bind positions of the body bones.
 */
export function buildBiped(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
): BodyBones {
  const frame = bodyFrame(species, stance);
  const { h, girth, forward, at } = frame;
  const colors = bodyColors(species);
  const armColor = partColor(species, colors, 'arms');

  // The torso: a round pear of 16 sides and 13 rings, 1.35 H tall, 1.28 H wide at the hips, and
  // 0.9 H at the shoulders, with the belly forward. Its top is under the chin. Every second ring
  // turns by half a side, so that the torso has small triangle facets, as in `animals.webp`. The
  // part below the chest bone follows `spine`. The part above it follows `chest`, as the
  // shoulders and the arms do (design 4.7). A stripe down the front gets the belly color.
  const chestY = CHEST;
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
        [0.5, chestY, 1],
      ],
    ],
    [
      'chest',
      [
        [0.5, chestY, 1],
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

  // A short thick neck under the head, and the head. The head is the sculpted head of
  // `animals.webp`: 1.0 H tall and 1.26 H wide at the cheeks. Its top is 2.3 H above the seat, so
  // that it sits on the shoulders.
  addLimb(builder, at(0, NECK, 0), at(0, NECK + 0.45, 0), [0.3 * h, 0.27 * h], colors.fur, 'neck');
  const headCenter = at(0, HEAD_CENTER, -HEAD_FORWARD);
  // The lower face (the cheeks, the jaw, and the face up to the eyes) gets the belly color. The
  // forehead and the back of the head keep the fur color.
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

  const eyes = addEyes(builder, species, colors, h, headCenter);
  const [earL, earR] = addEars(builder, species, colors, h, headCenter);
  const snout = addSnout(builder, species, colors, h, headCenter);
  addFacePattern(builder, species, colors, h, headCenter);
  const [tail1, tail2] = addTail(builder, species, colors, h, tailBase(frame));

  const arms = buildArms(builder, species, colors, frame);
  const legs = buildLegs(builder, species, colors, frame);

  return {
    headHeight: h,
    headCenter,
    mouth: snout.mouth,
    floor: [0, 0, -forward],
    palmL: arms.palmL,
    palmR: arms.palmR,
    fingerBlockL: arms.fingerBlockL,
    fingerBlockR: arms.fingerBlockR,
    positions: {
      root: [0, 0, 0],
      hips: at(0, 0.15, 0),
      spine: at(0, 0.45, 0),
      chest: at(0, chestY, 0),
      neck: at(0, NECK, 0),
      head: at(0, HEAD_CENTER - 0.5, -HEAD_FORWARD),
      jaw: snout.jaw,
      eyeL: eyes[0],
      eyeR: eyes[1],
      earL,
      earR,
      tail1,
      tail2,
      trunk1: snout.trunk[0],
      trunk2: snout.trunk[1],
      trunk3: snout.trunk[2],
      shoulderL: arms.positions.shoulderL,
      upperArmL: arms.positions.upperArmL,
      forearmL: arms.positions.forearmL,
      handL: arms.positions.handL,
      fingersL: arms.positions.fingersL,
      shoulderR: arms.positions.shoulderR,
      upperArmR: arms.positions.upperArmR,
      forearmR: arms.positions.forearmR,
      handR: arms.positions.handR,
      fingersR: arms.positions.fingersR,
      thighL: legs.thighL,
      shinL: legs.shinL,
      footL: legs.footL,
      thighR: legs.thighR,
      shinR: legs.shinR,
      footR: legs.footR,
    },
  };
}

import { MathUtils } from 'three';
import { below, clavicleJoint, SHOULDER_JOINT, shoulderJoint } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { ball, icosphere } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { SpeciesParams } from './species.ts';
import { sweep } from './sweep.ts';
import type { SweepRing } from './sweep.ts';

/** The bones that the arms place. */
export type ArmBoneName = Extract<
  BoneName,
  | 'shoulderL'
  | 'upperArmL'
  | 'forearmL'
  | 'handL'
  | 'fingersL'
  | 'shoulderR'
  | 'upperArmR'
  | 'forearmR'
  | 'handR'
  | 'fingersR'
>;

/** The bind positions of the arm bones, and the points of the hands that the instruments need. */
export interface ArmBones {
  /** The bind position of each arm bone. */
  readonly positions: Readonly<Record<ArmBoneName, Vec3>>;
  /** The point in the middle of the palm of the left hand. */
  readonly palmL: Vec3;
  /** The point in the middle of the palm of the right hand. */
  readonly palmR: Vec3;
  /** The middle of the finger block of the left hand, on its `fingers` bone. */
  readonly fingerBlockL: Vec3;
  /** The middle of the finger block of the right hand, on its `fingers` bone. */
  readonly fingerBlockR: Vec3;
}

/**
 * The upper arm, from the shoulder joint to the elbow, in H (design 4.5). With the forearm, the
 * shoulder is 1.43 H from the palm: 0.60 of the seated height, as the reference image shows (0.55
 * to 0.62). The first arms (0.6 H and 0.55 H, 0.51 of the seated height) did not reach the bow
 * hair of the bowed strings, nor 7 of the 11 other instruments (review of step 4).
 */
export const UPPER_ARM = 0.7;

/** The forearm, from the elbow to the wrist, in H (design 4.5). */
export const FOREARM = 0.65;

/**
 * The radii of the arm, in H: at the shoulder, at the elbow, and at the wrist. Thick, soft upper
 * arms give the chubby look of `mockup.png` (spec of the cute bodies, 2.4). The arms of 0.34 to
 * 0.24 H wide before looked thin, and the arms of 0.40 to 0.30 H of the second round looked like
 * boxes. The radius at the shoulder is the radius of the shoulder dome of the body frame. The
 * wrist keeps 0.12 H: the bow stick lies 0.127 H to the palm side of the middle of the hand
 * (`BOW_GRIP`), and a wrist of 0.13 H or more put the frog end of the stick into the forearm of
 * the dog and the cat. The elbow keeps 0.16 H: with 0.17 H, the left forearm of the conductor
 * came 1.9 cm from its head in the lift of the count-in of K. 525 (limit 2 cm).
 */
export const ARM_RADII = [SHOULDER_JOINT.dome, 0.16, 0.12] as const;

/** The number of sides of the arm tube (design 4.5, facets). */
const ARM_SIDES = 8;

/**
 * The radius of the middle ring of the forearm, as a factor of the mean of its end radii. The
 * forearm bulges a little, as a soft muscle. The upper arm has no middle ring, so that a body
 * keeps its budget of triangles.
 */
const ARM_BULGE = 1.05;

/**
 * The distance of the rings above and below the elbow joint from the ring at the joint, in H.
 * The three close rings keep the elbow round, and they hold the band of a narrow blend of the
 * elbow (`docs/research/2026-10-06-shoulder-spike.md`).
 */
const ELBOW_BAND = 0.06;

/**
 * The radius of the elbow filler, as a part of the radius of the arm at the elbow. The faces of a
 * ring of 8 sides are 0.924 of its radius from the axis, so the filler of 0.9 stays hidden in the
 * bind pose, and it fills the outer side of a bent elbow.
 */
const ELBOW_FILLER = 0.9;

/** The joints of one arm in the bind pose, and the middle of its finger block. */
interface ArmJoints {
  /** The clavicle: the bind position of the `shoulder` bone. */
  readonly clavicle: Vec3;
  /** The shoulder joint: the bind position of the `upperArm` bone. */
  readonly shoulder: Vec3;
  /** The elbow: the bind position of the `forearm` bone. */
  readonly elbow: Vec3;
  /** The wrist: the bind position of the `hand` bone. */
  readonly wrist: Vec3;
  /** The knuckles: the bind position of the `fingers` bone. */
  readonly knuckles: Vec3;
  /** The middle of the finger block, below the knuckles. */
  readonly fingerBlock: Vec3;
}

/**
 * Adds the two arms and hands of a body in its bind pose (design 4.5). The arms hang down beside
 * the body.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @returns The bind positions of the arm bones, and the points of the hands.
 */
export function buildArms(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
): ArmBones {
  const left = addArm(builder, species, colors, frame, -1);
  const right = addArm(builder, species, colors, frame, 1);

  const palm = (wrist: Vec3): Vec3 => below(wrist, 0.08 * frame.h);
  return {
    palmL: palm(left.wrist),
    palmR: palm(right.wrist),
    fingerBlockL: left.fingerBlock,
    fingerBlockR: right.fingerBlock,
    positions: {
      shoulderL: left.clavicle,
      upperArmL: left.shoulder,
      forearmL: left.elbow,
      handL: left.wrist,
      fingersL: left.knuckles,
      shoulderR: right.clavicle,
      upperArmR: right.shoulder,
      forearmR: right.elbow,
      handR: right.wrist,
      fingersR: right.knuckles,
    },
  };
}

/**
 * Adds one arm: one tube of 8 sides from a round dome around the shoulder joint to a cuff at the
 * wrist, a filler ball in the elbow, and a round mitten hand of 0.25 H (design 4.5, 4.7). The dome and the
 * upper arm follow `upperArm`, and the forearm and the cuff follow `forearm`. The filler fills
 * the outer side of a bent elbow, so the elbow shows no notch. The dome is a round ball of the
 * arm radius that sinks into the torso in each turn of the arm (decision D2 of the skinned
 * bodies). The hand stays rigid, because the wrist turns by up to 180°.
 *
 * @param builder The mesh that gets the parts.
 * @param species The species parameters.
 * @param colors The colors of the species.
 * @param frame The frame of the body.
 * @param side -1 for the left arm, 1 for the right arm.
 * @returns The joints of the arm.
 */
function addArm(
  builder: MeshBuilder,
  species: SpeciesParams,
  colors: BodyColors,
  frame: BodyFrame,
  side: -1 | 1,
): ArmJoints {
  const { h, girth } = frame;
  const shoulder = shoulderJoint(frame, side);
  const elbow = below(shoulder, UPPER_ARM * h);
  const wrist = below(elbow, FOREARM * h);
  const knuckles = below(wrist, 0.12 * h);
  const left = side < 0;
  const upperArm = boneIndex(left ? 'upperArmL' : 'upperArmR');
  const forearm = boneIndex(left ? 'forearmL' : 'forearmR');

  // The tube splits at the ring of the elbow joint: the upper part follows `upperArm`, and the
  // lower part follows `forearm`. A cap closes each part at the split, so that each part is a
  // closed solid, and the filler fills the outer side of a bent elbow.
  const armColor = partColor(species, colors, 'arms');
  const rings = armRings(frame, shoulder);
  const options = { sides: ARM_SIDES, side: [1, 0, 0] } as const;
  builder.add(sweep(rings.slice(0, ELBOW_RING + 1), options), {
    color: armColor,
    bone: upperArm,
  });
  builder.add(sweep(rings.slice(ELBOW_RING), options), {
    color: armColor,
    bone: forearm,
  });
  builder.add(ball(ELBOW_FILLER * ARM_RADII[1] * girth * h, ARM_SIDES, 3), {
    color: armColor,
    bone: forearm,
    at: transform(elbow),
    filler: true,
  });

  const handColor = partColor(species, colors, 'hands');
  // A round mitten: the palm and the fingers are two faceted balls.
  builder.add(icosphere(1, 0), {
    color: handColor,
    bone: boneIndex(left ? 'handL' : 'handR'),
    at: transform(below(wrist, 0.06 * h), undefined, [0.13 * h, 0.09 * h, 0.1 * h]),
  });
  const fingerBlock = below(knuckles, 0.05 * h);
  builder.add(icosphere(1, 0), {
    color: handColor,
    bone: boneIndex(left ? 'fingersL' : 'fingersR'),
    at: transform(fingerBlock, undefined, [0.12 * h, 0.08 * h, 0.09 * h]),
  });

  return {
    clavicle: clavicleJoint(frame, side),
    shoulder,
    elbow,
    wrist,
    knuckles,
    fingerBlock,
  };
}

/** The index of the ring of the arm at the elbow joint. */
const ELBOW_RING = 5;

/**
 * Gives the rings of one arm tube in the bind pose, where the arm hangs straight down: the top
 * point and two rings of the dome over the shoulder joint, the ring around the joint, three rings
 * around the elbow, the middle of the forearm, and the cuff at the wrist. Each ring turns by half a side against its neighbors.
 *
 * @param frame The frame of the body.
 * @param shoulder The shoulder joint.
 * @returns The rings, in meters.
 */
function armRings(frame: BodyFrame, shoulder: Vec3): SweepRing[] {
  const { h, girth } = frame;
  const [shoulderR, elbowR, wristR] = [
    ARM_RADII[0] * girth * h,
    ARM_RADII[1] * girth * h,
    ARM_RADII[2] * girth * h,
  ];
  // The radius of the arm at a distance below the shoulder joint, in meters.
  const radiusAt = (d: number): number => {
    const elbowAt = UPPER_ARM * h;
    return d <= elbowAt
      ? shoulderR + ((elbowR - shoulderR) * d) / elbowAt
      : elbowR + ((wristR - elbowR) * (d - elbowAt)) / (FOREARM * h);
  };
  const dome = (degrees: number): readonly [number, number] => {
    const angle = degrees * MathUtils.DEG2RAD;
    return [-shoulderR * Math.cos(angle), shoulderR * Math.sin(angle)];
  };

  const elbowAt = UPPER_ARM * h;
  const band = ELBOW_BAND * h;
  const foreMiddle = (elbowAt + band + (UPPER_ARM + FOREARM) * h) / 2;
  const places: readonly (readonly [number, number])[] = [
    dome(0),
    dome(30),
    dome(60),
    [0, shoulderR],
    [elbowAt - band, radiusAt(elbowAt - band)],
    [elbowAt, elbowR],
    [elbowAt + band, radiusAt(elbowAt + band)],
    [foreMiddle, ((radiusAt(elbowAt + band) + wristR) / 2) * ARM_BULGE],
    [(UPPER_ARM + FOREARM) * h, wristR],
  ];
  return places.map(([d, radius], i) => ({
    at: below(shoulder, d),
    axis: [0, -1, 0],
    radius,
    turn: i % 2 === 0 ? 0.5 : 0,
  }));
}

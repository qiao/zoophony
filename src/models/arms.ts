import { below, clavicleJoint, SHOULDER_JOINT, shoulderJoint } from './body-frame.ts';
import type { BodyFrame } from './body-frame.ts';
import { addLimb, partColor } from './body-parts.ts';
import type { BodyColors } from './body-parts.ts';
import type { Vec3 } from './tuples.ts';
import { transform } from './mesh.ts';
import type { MeshBuilder } from './mesh.ts';
import { icosphere } from './primitives.ts';
import { boneIndex } from './rig.ts';
import type { BoneName } from './rig.ts';
import type { SpeciesParams } from './species.ts';

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
 * The radii of the arm, in H: at the shoulder, at the elbow, and at the wrist. The thinner arms of
 * `animals.webp` replace the arms of 0.40 to 0.30 H wide. The radius at the shoulder is the radius
 * of the shoulder dome of the body frame.
 */
const ARM = [SHOULDER_JOINT.dome, 0.14, 0.12] as const;

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
 * Adds one arm: an upper arm, a forearm, and a round mitten hand of 0.25 H. The upper arm starts
 * in a dome around the shoulder joint, so that the shoulder is a round ball that sinks into the
 * torso in each turn of the arm. The flat end of the first upper arm stood 0.07 H out of the side
 * of the torso, and a raised arm showed a gap there.
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
  const armColor = partColor(species, colors, 'arms');
  const shoulder = shoulderJoint(frame, side);
  const elbow = below(shoulder, UPPER_ARM * h);
  const wrist = below(elbow, FOREARM * h);
  const knuckles = below(wrist, 0.12 * h);
  const left = side < 0;

  addLimb(
    builder,
    shoulder,
    elbow,
    [ARM[0] * girth * h, ARM[1] * girth * h],
    armColor,
    left ? 'upperArmL' : 'upperArmR',
    true,
  );
  addLimb(
    builder,
    elbow,
    wrist,
    [ARM[1] * girth * h, ARM[2] * girth * h],
    armColor,
    left ? 'forearmL' : 'forearmR',
  );

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

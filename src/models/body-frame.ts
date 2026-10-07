import { Vector3 } from 'three';
import { toVec3 } from './tuples.ts';
import type { Vec3 } from './tuples.ts';
import { RABBIT_HEAD_HEIGHT } from './species.ts';
import type { SpeciesParams } from './species.ts';

/**
 * How a body rests in its bind pose (design 4.5, 4.7). A seated body sits on a seat, with the
 * thighs forward and the shins down to its feet. A standing body has straight legs, and its feet
 * are on the floor.
 */
export type Stance =
  | {
      /** The kind of the stance: on a seat. */
      readonly kind: 'seated';
      /** The height of the top of the seat above the floor, in meters. */
      readonly seatHeight: number;
      /**
       * The height of the rest under the feet, in meters: 0 for the floor, or the height of the
       * foot ring of a high stool.
       */
      readonly footHeight: number;
      /**
       * The distance of the body in front of the seat center (-z), in meters, so that the torso
       * keeps clear of a chair back.
       */
      readonly forward: number;
    }
  | {
      /** The kind of the stance: on the floor, with no seat. */
      readonly kind: 'standing';
    };

/**
 * Makes the stance of a body on a seat.
 *
 * @param seatHeight The height of the seat, in meters.
 * @param footHeight The height of the rest under the feet, in meters. Default: the floor.
 * @param forward The distance of the body in front of the seat center, in meters. Default: 0.
 * @returns The stance.
 */
export function seated(seatHeight: number, footHeight = 0, forward = 0): Stance {
  return { kind: 'seated', seatHeight, footHeight, forward };
}

/**
 * The height of the base of the torso above the floor for a standing body, in H (design 4.5).
 * The legs of a standing body are 30% of its height, as in the reference image (about 25%). The
 * legs of a body on a chair, straight down, made them 41% of the height of the bear.
 */
export const STANDING_BASE = 0.77;

/**
 * The size, the girth, and the stance of one body in its bind pose (design 4.3, 4.5). The trunk,
 * the arms, the legs, and the tail read their places from it.
 */
export interface BodyFrame {
  /** The head height `H` of the species, in meters (design 4.5, body proportions). */
  readonly h: number;
  /** The girth of the species: a factor of the widths of the torso and the limbs. */
  readonly girth: number;
  /** Whether the body stands on the floor. A body that does not stand sits on a seat. */
  readonly standing: boolean;
  /** The height of the rest under the feet, in meters: 0 for the floor. */
  readonly footHeight: number;
  /** The distance of the body in front of the seat center (-z), in meters. */
  readonly forward: number;
  /**
   * Gives a point of the body in meters, in the axes of the model. The animal faces -z, and its
   * left side is -x.
   *
   * @param x The distance to the side, in H.
   * @param y The height above the middle of the base of the torso, in H.
   * @param z The distance to the back, in H.
   * @returns The point.
   */
  readonly at: (x: number, y: number, z: number) => Vec3;
}

/**
 * Makes the frame of a body. The base of the torso is on the seat, or {@link STANDING_BASE} above
 * the floor for a standing body.
 *
 * @param species The species parameters.
 * @param stance The seat under the body, or no seat.
 * @returns The frame.
 */
export function bodyFrame(species: SpeciesParams, stance: Stance): BodyFrame {
  const h = RABBIT_HEAD_HEIGHT * species.size;
  const standing = stance.kind === 'standing';

  // The base of the torso: the seat, or the base of a standing body.
  const seatHeight = standing ? STANDING_BASE * h : stance.seatHeight;
  const forward = standing ? 0 : stance.forward;

  return {
    h,
    girth: species.girth ?? 1,
    standing,
    footHeight: standing ? 0 : stance.footHeight,
    forward,
    at: (x, y, z) => [x * h, seatHeight + y * h, z * h - forward],
  };
}

/**
 * Gives the point at a distance straight below another point.
 *
 * @param p The point.
 * @param distance The distance, in meters.
 * @returns The point below.
 */
export function below(p: Vec3, distance: number): Vec3 {
  return toVec3(new Vector3(...p).add(new Vector3(0, -distance, 0)));
}

/**
 * The shoulder joints, where the arms meet the torso (design 4.5, 4.7). The trunk and the arms
 * both read these values, so that the shoulder dome of each arm sinks into the torso. The
 * shoulder is the overlap of decision D2 of the skinned bodies: the dome is rigid on `upperArm`,
 * and the torso has no port (`docs/research/2026-10-06-shoulder-spike.md`).
 */
export const SHOULDER_JOINT = {
  /** The height of the joints above the base of the torso, in H. */
  height: 0.98,
  /** The distance of each joint from the middle of the body, in H, times the girth. */
  spread: 0.52,
  /** The distance of each clavicle bone from the middle of the body, in H, times the girth. */
  clavicle: 0.15,
  /** The radius of the dome of the upper arm around each joint, in H, times the girth. */
  dome: 0.17,
  /**
   * The half width of the torso at the height of the joints, in H, times the girth. The dome
   * reaches in to `spread - dome` (0.35) from the middle, so a half width of at least
   * `spread - dome + overlap` (0.40) keeps the overlap in the bind pose. The full shoulders of
   * the cute bodies have 0.5 (0.45 before), so that the torso has no dent between the chest and
   * the rings above the joints.
   */
  torsoHalfWidth: 0.5,
  /**
   * The smallest depth of the dome in the torso, in H, in each pose (the test of the shoulder
   * joints in `pose/arm-joints.test.ts`).
   */
  overlap: 0.05,
} as const;

/**
 * Gives the place of a shoulder joint: the bind position of the `upperArm` bone.
 *
 * @param frame The frame of the body.
 * @param side -1 for the left side, 1 for the right side.
 * @returns The joint.
 */
export function shoulderJoint(frame: BodyFrame, side: -1 | 1): Vec3 {
  return frame.at(side * SHOULDER_JOINT.spread * frame.girth, SHOULDER_JOINT.height, 0);
}

/**
 * Gives the place of a clavicle: the bind position of the `shoulder` bone, a child of `chest`.
 *
 * @param frame The frame of the body.
 * @param side -1 for the left side, 1 for the right side.
 * @returns The clavicle.
 */
export function clavicleJoint(frame: BodyFrame, side: -1 | 1): Vec3 {
  return frame.at(side * SHOULDER_JOINT.clavicle * frame.girth, SHOULDER_JOINT.height, 0);
}

/** The hip joints, where the thighs start in the bottom of the torso (design 4.5). */
export const HIP_JOINT = {
  /** The distance of each joint from the middle of the body, in H, times the girth. */
  spread: 0.32,
  /** The height of a seated joint above the seat, in H. The thick thigh rests on the seat. */
  seated: 0.3,
  /** The height of a standing joint above the base of the torso, in H. */
  standing: 0.17,
  /** The z of the joints, in H: a little in front of the axis of the torso. */
  z: -0.05,
} as const;

/**
 * Gives the place of a hip joint: the bind position of the `thigh` bone.
 *
 * @param frame The frame of the body.
 * @param side -1 for the left side, 1 for the right side.
 * @returns The joint.
 */
export function hipJoint(frame: BodyFrame, side: -1 | 1): Vec3 {
  const y = frame.standing ? HIP_JOINT.standing : HIP_JOINT.seated;
  return frame.at(side * HIP_JOINT.spread * frame.girth, y, HIP_JOINT.z);
}

/**
 * Gives the base of the tail, at the back of the torso: the bind position of the `tail1` bone.
 *
 * @param frame The frame of the body.
 * @returns The base.
 */
export function tailBase(frame: BodyFrame): Vec3 {
  return frame.at(0, 0.3, 0.3);
}

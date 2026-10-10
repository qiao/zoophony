import { DEFAULT_HEAD_HEIGHT } from './species.ts';
import type { SpeciesParams } from './species.ts';

/** The place of a seated knee, in H: the bind position of the `shin` bone (design 4.5). */
export interface KneePlace {
  /** The distance in front of the hip joint. */
  readonly forward: number;
  /** The height above the seat. */
  readonly height: number;
}

/**
 * The skeleton of one species (design 4.3, 4.5): the head height `H`, and the places and the
 * lengths of the bones of the body. Each length is in H, except `headHeight`. The trunk, the
 * arms, and the legs read these values from the frame of the body (`body-frame.ts`).
 */
export interface BodyProportions {
  /** The head height `H`, in meters. Default: {@link DEFAULT_HEAD_HEIGHT} × the species size. */
  readonly headHeight: number;
  /**
   * The height of the head center above the base of the torso. Default 1.8: the head top is then
   * 2.3 H above the seat, so that the head is 0.30 of the height of a seated rabbit, as in
   * `animals.webp`. The `head` bone stays 0.5 H below the head center.
   */
  readonly headCenter: number;
  /**
   * The height of the shoulder joints above the base of the torso. Default 0.98. The heights of
   * the torso rings, the bones, and the blend bands below the joints scale with it. The heights
   * between the joints and the neck ring stay at the same part of the way from the joints to the
   * neck ring.
   */
  readonly shoulderHeight: number;
  /** The distance of each shoulder joint from the middle. Default 0.52. */
  readonly shoulderSpread: number;
  /**
   * The upper arm, from the shoulder joint to the elbow. Default 0.7. With the forearm, the
   * shoulder is 1.43 H from the palm: 0.60 of the seated height, as the reference image shows
   * (0.55 to 0.62). The first arms (0.6 H and 0.55 H) did not reach the bow hair of the bowed
   * strings, nor 7 of the 11 other instruments (review of step 4).
   */
  readonly upperArm: number;
  /** The forearm, from the elbow to the wrist. Default 0.65. */
  readonly forearm: number;
  /** The distance of each hip joint from the middle of the body. Default 0.32. */
  readonly hipSpread: number;
  /**
   * The place of the seated knee. Default: 0.68 H in front of the hip joint, at the height of the
   * hip joint. The thigh lies flat on the seat, and the knee reaches past the front edge of the
   * chair, as in `animals.webp`.
   */
  readonly seatedKnee: KneePlace;
  /** The factor of the depth of the torso, at the front and at the back. Default 1. */
  readonly torsoDepth: number;
  /**
   * The height of the base of the torso above the floor for a standing body. Default 0.77: the
   * legs of a standing body are then 30% of its height, as in the reference image (about 25%).
   * The legs of a body on a chair, straight down, made them 41% of the height of the bear.
   */
  readonly standingBase: number;
}

/** The values of the skeleton that do not depend on the size of a species. */
export const DEFAULT_PROPORTIONS = {
  headCenter: 1.8,
  shoulderHeight: 0.98,
  shoulderSpread: 0.52,
  upperArm: 0.7,
  forearm: 0.65,
  hipSpread: 0.32,
  seatedKnee: { forward: 0.68, height: 0.3 },
  torsoDepth: 1,
  standingBase: 0.77,
} as const satisfies Omit<BodyProportions, 'headHeight'>;

/**
 * Gives the skeleton of a species: each value of its `proportions`, and the default of each
 * value that it does not give.
 *
 * @param species The species parameters.
 * @returns The skeleton.
 */
export function proportionsOf(species: SpeciesParams): BodyProportions {
  const own = species.proportions;
  return {
    headHeight: own?.headHeight ?? DEFAULT_HEAD_HEIGHT * species.size,
    headCenter: own?.headCenter ?? DEFAULT_PROPORTIONS.headCenter,
    shoulderHeight: own?.shoulderHeight ?? DEFAULT_PROPORTIONS.shoulderHeight,
    shoulderSpread: own?.shoulderSpread ?? DEFAULT_PROPORTIONS.shoulderSpread,
    upperArm: own?.upperArm ?? DEFAULT_PROPORTIONS.upperArm,
    forearm: own?.forearm ?? DEFAULT_PROPORTIONS.forearm,
    hipSpread: own?.hipSpread ?? DEFAULT_PROPORTIONS.hipSpread,
    seatedKnee: own?.seatedKnee ?? DEFAULT_PROPORTIONS.seatedKnee,
    torsoDepth: own?.torsoDepth ?? DEFAULT_PROPORTIONS.torsoDepth,
    standingBase: own?.standingBase ?? DEFAULT_PROPORTIONS.standingBase,
  };
}

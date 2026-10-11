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
   * The place of the seated knee. Default: 0.68 H in front of the hip joint and 0.1 H above the
   * seat, so that the knee is near the height of the seat, as in the reference images. The thigh
   * slopes a little down from the hip joint (`HIP_JOINT.seated` of `body-frame.ts`), and the knee
   * reaches past the front edge of the chair. At the old height of the hip joint (0.3 H), the round
   * knee stood 0.53 H above the seat, against 0.23 to 0.43 H in the reference images. With a thigh of 0.58 H, the shin
   * went 0.04 m through the front of the seat of the chair
   * (`docs/research/2026-10-11-short-legs.md`).
   */
  readonly seatedKnee: KneePlace;
  /**
   * The height of the seat of the chair above the floor, and of the seat of the high stool above
   * its foot ring. Default 0.75: the user chose seats below the median of the reference images
   * (0.92 H, range 0.76 to 1.10 H), so that the seated legs look clearly short in the default
   * view (`docs/research/2026-10-11-low-seats.md`). With 0.92 H, the seated rabbits, foxes, and
   * wolves looked almost as before. The lower seats move the seated bodies down from the bodies of
   * their model sheets, and the silhouettes match a little less. These seats fit the legs
   * (`seatHeights()` of `props.ts`). The chair of 0.35 m for all species gave 0.68 H to the rhino
   * and 1.23 H to the mouse.
   */
  readonly seatHeight: number;
  /**
   * The height of the base of the torso above the floor for a standing body. Default 0.55: the
   * legs of the standing bear of `animals.webp` and of `bear-views.png`, in the height of its
   * trunk (`docs/research/2026-10-11-short-legs.md`). The legs of 2026-10-06 (0.77 H) were 1.4
   * times as long. The legs of a body on a chair, straight down, made them 41% of the height of
   * the bear.
   */
  readonly standingBase: number;
  /**
   * The thigh of a standing body, from the hip joint straight down to the knee. Default 0.33, so
   * that the thigh keeps its part of the leg of 2026-10-06 (0.45 H). The shin goes on down to the
   * ankle, 0.1 H above the floor.
   */
  readonly standingThigh: number;
}

/** The values of the skeleton that do not depend on the size of a species. */
export const DEFAULT_PROPORTIONS = {
  headCenter: 1.8,
  shoulderHeight: 0.98,
  shoulderSpread: 0.52,
  upperArm: 0.7,
  forearm: 0.65,
  hipSpread: 0.32,
  seatedKnee: { forward: 0.68, height: 0.1 },
  seatHeight: 0.75,
  standingBase: 0.55,
  standingThigh: 0.33,
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
    seatHeight: own?.seatHeight ?? DEFAULT_PROPORTIONS.seatHeight,
    standingBase: own?.standingBase ?? DEFAULT_PROPORTIONS.standingBase,
    standingThigh: own?.standingThigh ?? DEFAULT_PROPORTIONS.standingThigh,
  };
}

import type { PlayerCast } from './cast.ts';
import type { Vec3 } from './tuples.ts';
import type { Support } from './props.ts';

/** The place of one player (design 5.1). */
export interface PlayerPlace {
  readonly position: Vec3;
  /** Radians around y. 0 faces -z (the back). */
  readonly facing: number;
  readonly support: Support;
  /** The species and the instrument of the player, for `buildPlayer()`. */
  readonly cast: PlayerCast;
}

/** The place of one music stand. */
export interface StandPlace {
  readonly position: Vec3;
  /** Radians around y: the facing of the players who read from it. */
  readonly facing: number;
}

/**
 * One level of the choir risers (design 4.5, seat geometry): an arc block around the podium
 * center, 0.8 m deep, from the stage top to its height.
 */
export interface RiserLevel {
  /** 0 is the lowest level, at the front. */
  readonly level: number;
  /** The radius of the middle of the level, in meters. The singers stand on it. */
  readonly radius: number;
  /** The height of the top above the stage top, in meters. */
  readonly height: number;
  /** Half the angle of the arc, in radians. The arc is centered on 0°. */
  readonly halfAngle: number;
}

/** The place of the conductor: the bear on the podium top (design 4.5). */
export interface ConductorPlace {
  /** The point on the podium top under the middle of the bear. */
  readonly position: Vec3;
  /** Radians around y. 0 faces -z: the bear faces the orchestra. */
  readonly facing: number;
}

/** The positions of the scene for one `Score` (design 5.1). `layoutScene()` calculates it. */
export interface SceneLayout {
  /** The stage side `S`, in meters (design 4.5). */
  readonly stageSide: number;
  readonly podium: Vec3;
  /** The conductor. It is not in {@link players}. */
  readonly conductor: ConductorPlace;
  /** One entry for each player, in the order of the players of the pose. */
  readonly players: readonly PlayerPlace[];
  readonly stands: readonly StandPlace[];
  readonly risers: readonly RiserLevel[];
}

/**
 * The stage side of the composition of the reference image, from the rule of design 4.5. Row 0
 * holds the first desks: two first violins and two second violins left of 0°, and the cello right
 * of it. Its radius is 4 × 0.95 m / 80° = 2.72 m. Row 1 holds the other violins, row 2 the two
 * flutes, and row 3 the three clarinets at the radius 6.32 m. The depth `D` is
 * 1.0 + 6.32 + 0.5 + 0.3 = 8.12, and `2 × L` is 7.93.
 */
export const REFERENCE_STAGE_SIDE = 8.12;

/** The arc length of one seated player (design 4.5, seat geometry). */
export const SEATED_ARC = 0.95;

/** The radius of row 0 (design 4.5, seat geometry). */
export const FIRST_ROW_RADIUS = 2.4;

/**
 * The distance from the row of a string player to its music stand, in meters. With the row step of
 * 1.2 m, the stand keeps 0.1 m from the chair back of the row in front (design 4.5).
 */
export const STAND_DISTANCE = 0.65;

/**
 * Places a player at an angle and a radius around the podium center (design 4.5, seat geometry).
 *
 * @param podium The podium center.
 * @param angle The angle. 0 points from the podium to the back (-z). Negative angles are on the
 *   left.
 * @param radius The distance from the podium center.
 * @returns The position on the stage top, and the facing to the podium.
 */
export function seatAt(
  podium: Vec3,
  angle: number,
  radius: number,
): Pick<PlayerPlace, 'position' | 'facing'> {
  return {
    position: [
      podium[0] + radius * Math.sin(angle),
      podium[1],
      podium[2] - radius * Math.cos(angle),
    ],
    facing: Math.PI - angle,
  };
}

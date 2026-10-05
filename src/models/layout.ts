import type { Vec3 } from './math.ts';
import type { Support } from './props.ts';
import { podiumCenter } from './stage.ts';

/** The place of one player (design 5.1). */
export interface PlayerPlace {
  readonly position: Vec3;
  /** Radians around y. 0 faces -z (the back). */
  readonly facing: number;
  readonly support: Support;
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

/** The positions of the scene for one `Score` (design 5.1). Step 4 adds `layoutScene()`. */
export interface SceneLayout {
  /** The stage side `S`, in meters (design 4.5). */
  readonly stageSide: number;
  readonly podium: Vec3;
  /** One entry for each player, in the order of the players of the pose. */
  readonly players: readonly PlayerPlace[];
  readonly stands: readonly StandPlace[];
  readonly risers: readonly RiserLevel[];
}

/**
 * The stage side of the composition of the reference image, from the rule of design 4.5: three
 * first violins in row 0 (radius 2.4), four second violins and a cello in row 1 (radius 3.6), and
 * two flutes and three clarinets in row 2 (radius 4.8). The depth `D` is
 * 1.0 + 4.8 + 0.5 + 0.3 = 6.6, and `2 × L` is 5.3.
 */
export const REFERENCE_STAGE_SIDE = 6.6;

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
export function seatAt(podium: Vec3, angle: number, radius: number): Omit<PlayerPlace, 'support'> {
  return {
    position: [
      podium[0] + radius * Math.sin(angle),
      podium[1],
      podium[2] - radius * Math.cos(angle),
    ],
    facing: Math.PI - angle,
  };
}

/**
 * The number of seats of row 0 in each of the six demos: four first violins and three violas.
 */
export const DEMO_FIRST_ROW_SEATS = 7;

/**
 * Makes the layout of step 3: the podium and one first violin at the outer left seat of row 0 of
 * the demos, at -68° (design 4.5, stage origin). `layoutScene()` of step 4 replaces it.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The layout with one player on a chair and one shared music stand.
 */
export function singleViolinLayout(stageSide: number): SceneLayout {
  const podium = podiumCenter(stageSide);
  // Row 0 is centered on 0°, so its outer left seat is three seats left of 0°.
  const angle = (-(DEMO_FIRST_ROW_SEATS - 1) / 2) * (SEATED_ARC / FIRST_ROW_RADIUS);
  const seat = seatAt(podium, angle, FIRST_ROW_RADIUS);
  // Two string players share one stand (design 4.5). The stand of the left seat stands in front
  // of the gap between it and the next seat on the right.
  const standAngle = angle + SEATED_ARC / 2 / FIRST_ROW_RADIUS;
  const stand = seatAt(podium, standAngle, FIRST_ROW_RADIUS - STAND_DISTANCE);
  return {
    stageSide,
    podium,
    players: [{ ...seat, support: 'chair' }],
    stands: [{ position: stand.position, facing: seat.facing }],
    risers: [],
  };
}

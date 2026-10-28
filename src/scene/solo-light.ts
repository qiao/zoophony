import type { SceneLayout } from '../models/layout.ts';
import { defaultAim } from './light-pool.ts';
import type { LightAim, StagePair } from './light-pool.ts';

/**
 * The light of a solo (design 2.4, 4.5). When the user solos one or more seats, the key light, its
 * pool, its hot spot, the visible beams, and their rim lights move to the players of these seats,
 * and they move back
 * when no seat is soloed. The aim comes from the solo flags and the layout only, so a seek, a
 * pause, or a mute keeps it. The render loop eases the lights to the aim.
 */
export const SOLO_LIGHT = {
  /**
   * The room around the place of a player, in meters: the body, the chair, and the instrument
   * beside it.
   */
  margin: 0.8,
  /**
   * The radius of the pool as a multiple of the half size of the group plus the margin. With 1.6,
   * a player at the edge of the box on one axis keeps 0.8 or more of the light of the pool center.
   */
  cover: 1.6,
  /** The smallest radius of the pool, in meters: the pool of one player. */
  minRadius: 1.6,
  /**
   * The part of the light that a place far from the pool keeps during a solo. It is lower than
   * the floor of the pool with no solo (0.4), so the players outside the pool step back. In the
   * default view of Boulanger, a solo of the cellos takes the median value of the conductor from
   * 85 to 39 and of the first violins from 80 to 27. With 0.4, they kept 50 and 38.
   */
  floor: 0.25,
  /**
   * The extra light of the key light at the center of the pool of a solo, as a part of its light:
   * the hot spot on the soloed players. A soloed player stands at the center of the hot spot, and
   * the key light from the front lights the white fur of its front.
   */
  boost: 0.85,
  /**
   * The time constant of the ease of the lights to a new aim, in seconds. The lights reach 95%
   * of the way in 3 time constants. With reduced motion, they move at once.
   */
  easeSec: 0.25,
} as const;

/**
 * Gives the aim of the stage lights for the solo flags of the seats (design 2.4, 4.5). With a solo,
 * the pool and the hot spot of the key light have their center at the middle of the box of the
 * soloed players, and their radii cover the box with {@link SOLO_LIGHT}. A radius is at most the
 * radius of the pool with no solo. The pool loses its long reach toward the back, so the back rows
 * outside the pool step back too. The key light aims at the center, and the beams and their rim
 * lights turn to it.
 * With no soloed seat that has players, the aim is the aim with no solo.
 *
 * @param layout The layout of the score.
 * @param soloed True for each soloed seat, by the index of the seat in `Score.seats`.
 * @returns The aim.
 */
export function soloAim(layout: SceneLayout, soloed: readonly boolean[]): LightAim {
  const podium = layout.conductor ? layout.podium : null;
  const free = defaultAim(layout.stageSide, podium);
  const places = layout.players
    .filter((player) => soloed[player.cast.seatIndex] === true)
    .map((player) => player.position);
  if (places.length === 0) {
    return free;
  }

  const xs = places.map(([x]) => x);
  const zs = places.map(([, , z]) => z);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minZ, maxZ] = [Math.min(...zs), Math.max(...zs)];
  const center: StagePair = [(minX + maxX) / 2, (minZ + maxZ) / 2];
  const radius: StagePair = [
    coverRadius((maxX - minX) / 2, free.radius[0]),
    coverRadius((maxZ - minZ) / 2, free.radius[1]),
  ];

  return {
    center,
    radius,
    reachBack: radius[1],
    spot: center,
    spotRadius: radius,
    boost: SOLO_LIGHT.boost,
    floor: SOLO_LIGHT.floor,
    beam: center,
  };
}

/**
 * Gives the radius of the pool that covers a group on one axis ({@link SOLO_LIGHT}).
 *
 * @param half The half size of the box of the places of the group on the axis, in meters.
 * @param most The radius of the pool with no solo on the axis, in meters.
 * @returns The radius, in meters.
 */
function coverRadius(half: number, most: number): number {
  const { margin, cover, minRadius } = SOLO_LIGHT;
  return Math.min(most, Math.max(minRadius, (half + margin) * cover));
}

/**
 * Gives the part of the way to a new aim that the lights move in one frame (design 2.4): an
 * ease with the time constant {@link SOLO_LIGHT}.easeSec, so that the light moves fast at first
 * and slows down at the end.
 *
 * @param dtSec The time since the last frame, in seconds.
 * @param reducedMotion True if the user prefers reduced motion. Then the lights move at once.
 * @returns The part, from 0 to 1.
 */
export function easeShare(dtSec: number, reducedMotion: boolean): number {
  if (reducedMotion) {
    return 1;
  }

  return 1 - Math.exp(-Math.max(0, dtSec) / SOLO_LIGHT.easeSec);
}

/**
 * Moves an aim of the stage lights a part of the way to another aim: each value goes in a
 * straight line.
 *
 * @param from The aim of the last frame.
 * @param to The new aim.
 * @param share The part of the way, from 0 (`from`) to 1 (`to`).
 * @returns The aim of this frame.
 */
export function easeAim(from: LightAim, to: LightAim, share: number): LightAim {
  const mix = (a: number, b: number): number => a + (b - a) * share;
  const pair = (a: StagePair, b: StagePair): StagePair => [mix(a[0], b[0]), mix(a[1], b[1])];

  return {
    center: pair(from.center, to.center),
    radius: pair(from.radius, to.radius),
    reachBack: mix(from.reachBack, to.reachBack),
    spot: pair(from.spot, to.spot),
    spotRadius: pair(from.spotRadius, to.spotRadius),
    boost: mix(from.boost, to.boost),
    floor: mix(from.floor, to.floor),
    beam: pair(from.beam, to.beam),
  };
}

/**
 * Gives the largest difference between two aims of the stage lights, in meters for the places and
 * the radii, and as a part of the light for the boost and the floor. The render loop stops the
 * ease when the difference is small.
 *
 * @param a The first aim.
 * @param b The second aim.
 * @returns The largest difference of one value.
 */
export function aimGap(a: LightAim, b: LightAim): number {
  const pairs = [
    [a.center, b.center],
    [a.radius, b.radius],
    [a.spot, b.spot],
    [a.spotRadius, b.spotRadius],
    [a.beam, b.beam],
  ] as const;

  let gap = Math.max(
    Math.abs(a.boost - b.boost),
    Math.abs(a.floor - b.floor),
    Math.abs(a.reachBack - b.reachBack),
  );
  for (const [p, q] of pairs) {
    gap = Math.max(gap, Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]));
  }
  return gap;
}

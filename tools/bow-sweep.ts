/**
 * Measures the bow of a player in the samples of a sweep at a point at each 1 cm along each edge
 * of the bow (`bowPoints()` of `tools/lap-rest.ts`). The stick is one long box, so its corners
 * alone miss a thigh or an arm that the middle of the stick goes through. `pnpm pose-depth
 * --soloist` measures the standing soloist with it.
 */
import type { Vector3 } from 'three';

import { armSurface, bowPoints } from './lap-rest.ts';
import { closedDepth } from '../src/pose/test-clearance.ts';
import type { ClosedSurface } from '../src/pose/test-clearance.ts';
import type { PosedSkeleton } from '../src/pose/test-kinematics.ts';
import type { PairDepth, PairGap, SweepVisit } from '../src/pose/test-sweep.ts';

/** The name of the moving part of the bow in the results, as the part `bow` of a bowed role. */
export const BOW_PART = 'bow';

/** The name of the upper arms and the forearms as an obstacle of the bow. */
export const ARMS_OBSTACLE = 'arms';

/** The name of the floor in the gap of the lowest point of the bow. */
export const FLOOR = 'floor';

/** The bow of a player in one sample. */
export interface BowSample {
  /** The depth of the deepest point of the bow in each obstacle, by its name, in meters. */
  readonly depths: ReadonlyMap<string, number>;
  /** The height of the lowest point of the bow above the floor, in meters: below 0 under it. */
  readonly floor: number;
}

/**
 * Measures the bow of a player in one posed sample: the depth of its deepest point in each
 * obstacle and in the upper arms and the forearms ({@link ARMS_OBSTACLE}, `armSurface()` of
 * `tools/lap-rest.ts`), and the height of its lowest point above the floor. The paws hold the bow,
 * so they do not count.
 *
 * @param points The points of the bow ({@link bowPoints}), in the model axes.
 * @param surfaces The closed surface of each obstacle, by its name.
 * @param arms The closed surface of the upper arms and the forearms.
 * @returns The bow, or `null` for a player with no bow point.
 */
export function measureBow(
  points: readonly Vector3[],
  surfaces: ReadonlyMap<string, ClosedSurface>,
  arms: ClosedSurface,
): BowSample | null {
  if (points.length === 0) {
    return null;
  }
  const depths = new Map<string, number>();
  for (const [name, surface] of [...surfaces, [ARMS_OBSTACLE, arms] as const]) {
    depths.set(name, closedDepth(points, surface).depth);
  }
  return { depths, floor: Math.min(...points.map((p) => p.y)) };
}

/** The deepest points and the lowest point of the bow over the samples of a sweep. */
export interface BowSweep {
  /** Measures the bow of one posed sample. Give it to `sweepDepths()`. */
  readonly visit: SweepVisit;
  /**
   * Gives the deepest point of the bow in each obstacle over the samples so far, in the order of
   * the first sample. A depth of 0 has no bone, as in `sweepDepths()`.
   */
  readonly depths: () => PairDepth[];
  /** Gives the lowest point of the bow over the samples so far, as a gap to the floor. */
  readonly floor: () => PairGap;
}

/**
 * Starts the sweep of the bow: in each sample, it poses the bow and the arms with the skin of the
 * GPU, and keeps the deepest point of the bow in each obstacle and its lowest point
 * ({@link measureBow}). A sample with no bow point counts as no sample.
 *
 * @returns The sweep.
 */
export function bowSweep(): BowSweep {
  const deepest = new Map<string, PairDepth>();
  let lowest: PairGap = {
    part: BOW_PART,
    into: FLOOR,
    gap: Infinity,
    song: 0,
    wall: 0,
    bone: null,
  };
  const visit: SweepVisit = (posed: PosedSkeleton, [song, wall], surfaces) => {
    const bow = measureBow(bowPoints(posed), surfaces, armSurface(posed));
    if (!bow) {
      return;
    }
    for (const [into, depth] of bow.depths) {
      const best = deepest.get(into) ?? {
        part: BOW_PART,
        into,
        depth: 0,
        song: 0,
        wall: 0,
        bone: null,
        along: Number.NaN,
      };
      deepest.set(into, depth > best.depth ? { ...best, depth, song, wall, bone: 'bow' } : best);
    }
    if (bow.floor < lowest.gap) {
      lowest = { ...lowest, gap: bow.floor, song, wall, bone: 'bow' };
    }
  };
  return { visit, depths: () => [...deepest.values()], floor: () => lowest };
}

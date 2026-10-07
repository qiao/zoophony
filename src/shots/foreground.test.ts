import { describe, expect, it } from 'vitest';

import type { ClearBox, StageClearance } from './clearance.ts';
import { foregroundHead, foregroundObject } from './foreground.ts';
import type { StageHead } from './foreground.ts';
import type { Vec3 } from '../models/tuples.ts';

/** A camera on the +z axis that looks at the origin, 10 m away. */
const CAMERA: Vec3 = [0, 0, 10];

/** The target and the focus of the subject: the origin. */
const TARGET: Vec3 = [0, 0, 0];

/** The vertical field of view, in degrees. */
const FOV = 24;

/** The aspect of a desktop view. */
const DESKTOP = 1.6;

/**
 * Makes a head.
 *
 * @param owner The owner.
 * @param center The middle of the head.
 * @param radius The radius, 0.2 m by default.
 * @returns The head.
 */
function head(owner: number, center: Vec3, radius = 0.2): StageHead {
  return { owner, center, radius };
}

/**
 * Tells if one head stands in the foreground of the camera.
 *
 * @param heads The heads.
 * @param aspect The aspect of the view.
 * @returns The result of `foregroundHead()` for the subject 0 at the origin.
 */
function inFront(heads: readonly StageHead[], aspect = DESKTOP): boolean {
  return foregroundHead(heads, [0], TARGET, CAMERA, TARGET, FOV, aspect);
}

describe('foregroundHead (design 5.6, UX audit 2026-10-05, SC1)', () => {
  // At 5 m, half the frame height is 5 × tan(12°) = 1.06 m, and half its width 1.70 m.
  it('finds a near head at the edge of the frame', () => {
    expect(inFront([head(1, [1.5, -0.9, 5])])).toBe(true);
    // Out of the frame, and behind the camera.
    expect(inFront([head(1, [2.5, 0, 5])])).toBe(false);
    expect(inFront([head(1, [0, 0, 12])])).toBe(false);
  });

  it('finds a head a little nearer than the subject only over the middle of the frame', () => {
    // At 8.5 m from the camera, the share is 0.85.
    expect(inFront([head(1, [0.3, -0.4, 1.5])])).toBe(true);
    expect(inFront([head(1, [2, -1.5, 1.5])])).toBe(false);
    // At 9.7 m, the share is 0.97: behind the limit of 0.95.
    expect(inFront([head(1, [0, 0, 0.3])])).toBe(false);
  });

  it('skips the heads of the subject', () => {
    expect(inFront([head(0, [0, 0, 5])])).toBe(false);
    expect(foregroundHead([head(2, [0, 0, 5])], [0, 2], TARGET, CAMERA, TARGET, FOV, DESKTOP)).toBe(
      false,
    );
  });

  // At 8.5 m, half the frame height is 8.5 × tan(12°) = 1.81 m. A head of 0.5 m has the radius
  // 0.28 on the screen, and a head of 0.4 m 0.22.
  it('finds a large head at the bottom edge (UX audit 2026-10-06, N2)', () => {
    // The middle is 0.1 of the half height below the frame: more than half of the head shows.
    expect(inFront([head(1, [0, -1.99, 1.5], 0.5)])).toBe(true);
    // A smaller head at the same place passes.
    expect(inFront([head(1, [0, -1.99, 1.5], 0.4)])).toBe(false);
    // Only a thin cap of the large head shows: its middle is 0.2 below the frame.
    expect(inFront([head(1, [0, -2.17, 1.5], 0.5)])).toBe(false);
  });

  it('measures a head in a phone frame against the mean of its half sides (N3)', () => {
    // At 8.5 m, the frame is 1.81 m high at the half height. A head of 0.32 m has the radius 0.18
    // of it. The mean of the half sides of a phone in portrait is 1.81 m × √0.46 = 1.23 m, and
    // the radius is 0.26 of it. The middle of the head is 1.02 of the half height below the
    // middle of the frame.
    const low = head(1, [0, -1.85, 1.5], 0.32);
    expect(inFront([low])).toBe(false);
    expect(inFront([low], 390 / 844)).toBe(true);
  });

  // At 10 m, the chest of a singer 0.3 m below the target is 0.14 of the half height below the
  // middle of the frame. At 5 m, a head of 0.2 m has the radius 0.19 of the half height.
  it('skips a near head under the chests of the singers of a choir shot', () => {
    const chests: Vec3[] = [[0, -0.3, 0]];
    const under = (h: StageHead): boolean =>
      foregroundHead([h], [0], TARGET, CAMERA, TARGET, FOV, DESKTOP, chests);
    // The top of the head is 0.66 below the middle of the frame: under the singers.
    expect(inFront([head(1, [0, -0.9, 5])])).toBe(true);
    expect(under(head(1, [0, -0.9, 5]))).toBe(false);
    // A head that reaches above the chests covers a singer.
    expect(under(head(1, [0, -0.1, 5]))).toBe(true);
    // A large head under the singers still counts (N2).
    expect(under(head(1, [0, -1, 5], 0.4))).toBe(true);
  });
});

/**
 * Makes a box with no turn.
 *
 * @param x The x of the center.
 * @param z The z of the center.
 * @param half The half width in x and in z.
 * @param minY The bottom.
 * @param maxY The top.
 * @returns The box.
 */
function box(x: number, z: number, half: number, minY: number, maxY: number): ClearBox {
  return {
    x,
    z,
    cos: 1,
    sin: 0,
    halfX: half,
    halfZ: half,
    minY,
    maxY,
    reach: Math.hypot(half, half, (maxY - minY) / 2),
    clearance: 0.6,
  };
}

/**
 * Makes a stage with one obstacle of one box.
 *
 * @param owner The owner of the obstacle.
 * @param item The box.
 * @param kind The kind of the obstacle.
 * @returns The obstacles.
 */
function stageOf(
  owner: number,
  item: ClearBox,
  kind: 'player' | 'stand' | 'risers' = 'player',
): StageClearance {
  return {
    obstacles: [
      {
        owner,
        kind,
        x: item.x,
        z: item.z,
        radius: Math.SQRT2 * item.halfX,
        minY: item.minY,
        maxY: item.maxY,
        clearance: item.clearance,
        boxes: [item],
      },
    ],
  };
}

/**
 * Tells if the object of a stage covers too much of the frame of the camera.
 *
 * @param stage The stage.
 * @param aspect The aspect of the view.
 * @returns The result of `foregroundObject()` for the subject 0 at the origin.
 */
function covers(stage: StageClearance, aspect = DESKTOP): boolean {
  return foregroundObject(stage, [0], TARGET, CAMERA, TARGET, FOV, aspect);
}

describe('foregroundObject (design 5.6, UX audit 2026-10-06, N1 and N2)', () => {
  // At 6 m from the camera, the frame is 2 × 6 × tan(12°) = 2.55 m high and 4.08 m wide.
  it('finds an object that covers a large part of the frame', () => {
    // A box of 1.6 m × 1.6 m at the bottom left: about 0.39 × 0.5 of the frame, which is 20%.
    expect(covers(stageOf(1, box(-1.4, 4, 0.8, -1.3, 0.3)))).toBe(true);
    // A box of 1 m × 1 m: about 0.25 × 0.4 of the frame, which is 10%.
    expect(covers(stageOf(1, box(-1.4, 4, 0.5, -1.3, -0.3)))).toBe(false);
  });

  it('skips the subject, the risers, and the objects at the depth of the subject', () => {
    const large = box(-1.4, 4, 0.8, -1.3, 0.3);
    expect(covers(stageOf(0, large))).toBe(false);
    expect(covers(stageOf(-2, large, 'risers'))).toBe(false);
    expect(covers(stageOf(-2, large, 'stand'))).toBe(true);
    // At 9.5 m from the camera, the box is behind 0.9 of the depth of the subject.
    expect(covers(stageOf(1, box(-1.4, 0.5, 1.5, -1.3, 1.5)))).toBe(false);
  });

  it('counts a box beside or behind the camera as a large cover', () => {
    // The box reaches from 1 m in front of the camera to 1 m behind it, from 0.2 m to 2.2 m to
    // the right of the view axis. Its near corners fill the right part of the frame.
    expect(covers(stageOf(1, box(1.2, 10, 1, -0.3, 0.3)))).toBe(true);
    // A box fully behind the camera does not count.
    expect(covers(stageOf(1, box(1.2, 12, 1, -0.3, 0.3)))).toBe(false);
  });
});

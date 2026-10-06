import { describe, expect, it } from 'vitest';

import { foregroundHead } from './foreground.ts';
import type { StageHead } from './foreground.ts';
import type { Vec3 } from '../models/tuples.ts';

/** A camera on the +z axis that looks at the origin, 10 m away. */
const CAMERA: Vec3 = [0, 0, 10];

/** The target and the focus of the subject: the origin. */
const TARGET: Vec3 = [0, 0, 0];

/** The vertical field of view, in degrees. */
const FOV = 24;

/**
 * Makes a head of a radius of 0.2 m.
 *
 * @param owner The owner.
 * @param center The middle of the head.
 * @returns The head.
 */
function head(owner: number, center: Vec3): StageHead {
  return { owner, center, radius: 0.2 };
}

/**
 * Tells if one head stands in the foreground of the camera.
 *
 * @param heads The heads.
 * @returns The result of `foregroundHead()` for the subject 0 at the origin.
 */
function inFront(heads: readonly StageHead[]): boolean {
  return foregroundHead(heads, [0], TARGET, CAMERA, TARGET, FOV);
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
    expect(foregroundHead([head(2, [0, 0, 5])], [0, 2], TARGET, CAMERA, TARGET, FOV)).toBe(false);
  });
});

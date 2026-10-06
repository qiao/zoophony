import { describe, expect, it } from 'vitest';

import {
  CLEARANCE,
  bodyBoxes,
  cameraClear,
  pointBoxDistance,
  segmentBoxDistance,
  segmentClear,
  segmentCrossesBox,
} from './clearance.ts';
import type { ClearBox, StageClearance } from './clearance.ts';

/**
 * Makes a box of 1 m × 2 m × 1 m on the stage top, turned by an angle around y.
 *
 * @param x The x of the center.
 * @param z The z of the center.
 * @param facing The turn, in radians.
 * @returns The box.
 */
function boxAt(x: number, z: number, facing = 0, clearance = 0.6): ClearBox {
  return {
    x,
    z,
    cos: Math.cos(facing),
    sin: Math.sin(facing),
    halfX: 0.5,
    halfZ: 0.5,
    minY: 0,
    maxY: 2,
    reach: Math.hypot(0.5, 0.5, 1),
    clearance,
  };
}

/**
 * Makes the obstacles of a list of boxes, one obstacle for each box.
 *
 * @param boxes The boxes.
 * @returns The obstacles.
 */
function stageOf(boxes: readonly ClearBox[]): StageClearance {
  return {
    obstacles: boxes.map((box) => ({
      x: box.x,
      z: box.z,
      radius: Math.SQRT2 * 0.5,
      maxY: box.maxY,
      clearance: box.clearance,
      boxes: [box],
    })),
  };
}

describe('pointBoxDistance', () => {
  it('measures the distance from a point to a turned box', () => {
    const box = boxAt(0, 0);
    expect(pointBoxDistance(box, 0, 1, 0)).toBe(0);
    expect(pointBoxDistance(box, 1.5, 1, 0)).toBeCloseTo(1, 9);
    expect(pointBoxDistance(box, 0, 3, 0)).toBeCloseTo(1, 9);
    const turned = boxAt(0, 0, Math.PI / 4);
    // A corner of the turned box points along +x, at 0.707 m.
    expect(pointBoxDistance(turned, 1, 1, 0)).toBeCloseTo(1 - Math.SQRT1_2, 9);
  });
});

describe('segmentCrossesBox and segmentBoxDistance', () => {
  it('finds a segment through a box, and the distance of a segment beside it', () => {
    const box = boxAt(0, 0);
    const through = { ax: -2, ay: 1, az: 0, bx: 2, by: 1, bz: 0 };
    expect(segmentCrossesBox(box, through)).toBe(true);
    expect(segmentBoxDistance(box, through)).toBe(0);
    const beside = { ax: -2, ay: 1, az: 1.5, bx: 2, by: 1, bz: 1.5 };
    expect(segmentCrossesBox(box, beside)).toBe(false);
    expect(segmentBoxDistance(box, beside)).toBeCloseTo(1, 6);
    const above = { ax: -2, ay: 2.5, az: 0, bx: 2, by: 2.5, bz: 0 };
    expect(segmentBoxDistance(box, above)).toBeCloseTo(0.5, 6);
  });
});

describe('segmentClear', () => {
  it('skips the boxes of the subject, and keeps the clearance from the others', () => {
    const subject = boxAt(0, 0);
    const other = boxAt(3, 0);
    const stage = stageOf([subject, other]);
    const segment = { ax: 0, ay: 1, az: 0, bx: 0, by: 1, bz: 5 };
    expect(segmentClear(stage, segment, 'none', new Set())).toBe(false);
    expect(segmentClear(stage, segment, 'none', new Set([subject]))).toBe(true);
    // The other box is 2.5 m from the segment, and 0.5 m from the segment at x = 2.
    expect(segmentClear(stage, segment, 'clearance', new Set([subject]))).toBe(true);
    const near = { ax: 2, ay: 1, az: -1, bx: 2, by: 1, bz: 5 };
    expect(segmentClear(stage, near, 'clearance', new Set([subject]))).toBe(false);
  });
});

describe('cameraClear (design 5.6)', () => {
  it('needs a camera at least 0.6 m above the stage top', () => {
    const stage = stageOf([]);
    expect(cameraClear(stage, [0, 1, 0], [0, 0.5, 5], [0, 0.5, 9], new Set())).toBe(false);
    expect(cameraClear(stage, [0, 1, 0], [0, 0.7, 5], [0, 0.7, 9], new Set())).toBe(true);
    expect(CLEARANCE.height).toBe(0.6);
  });

  it('needs a line of sight past the boxes, and the distance of 1.0 m from the conductor', () => {
    const subject = boxAt(0, 0);
    const conductor = boxAt(0, 4, 0, CLEARANCE.conductor);
    const stage = stageOf([subject, conductor]);
    const held = bodyBoxes(stage, [0, 1, 0]);
    expect(held).toEqual(new Set([subject]));
    // The ray to +z crosses the conductor box at z = 4.
    expect(cameraClear(stage, [0, 1, 0], [0, 1, 3], [0, 1, 9], held)).toBe(false);
    // A camera 0.8 m beside the conductor box, with the ray past it.
    expect(cameraClear(stage, [0, 1, 0], [1.3, 1, 3], [1.3, 1, 3.5], held)).toBe(false);
    expect(cameraClear(stage, [0, 1, 0], [1.8, 1, 3], [1.8, 1, 3.5], held)).toBe(true);
  });
});

import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { DRAWER_COVER, sheetLift, viewFrame, viewOffset } from './frame.ts';
import { VIEW_OFFSET_Y } from './view.ts';

const OPEN = { right: 0, lift: 0 } as const;

/**
 * Projects a point of the units of the full view to the canvas with three.js and a view offset.
 *
 * @param args The arguments of `setViewOffset()`.
 * @param x The x of the point in the units of the full view.
 * @param y The y of the point in the units of the full view.
 * @returns The point on the canvas, in CSS pixels.
 */
function throughCamera(
  args: [number, number, number, number, number, number],
  x: number,
  y: number,
): [number, number] {
  const [, , , , width, height] = args;
  const camera = new PerspectiveCamera(30, width / height, 0.1, 100);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  // A point of the plain projection at a depth of 10 m.
  const point = new Vector3(x, y, 0.5).unproject(camera);
  camera.setViewOffset(...args);
  camera.updateProjectionMatrix();
  const p = point.project(camera);
  return [((p.x + 1) / 2) * width, ((1 - p.y) / 2) * height];
}

describe('viewFrame (design 4.5, camera)', () => {
  it('keeps the frame of the canvas with its middle in the middle of the area above the bar', () => {
    expect(viewFrame(1440, 900, OPEN)).toEqual({ scale: 1, x: 720, y: 450 - VIEW_OFFSET_Y });
  });

  it('moves the frame to the middle of the area left of the open drawer', () => {
    const frame = viewFrame(1440, 900, { ...OPEN, right: DRAWER_COVER });
    expect(frame).toEqual({ scale: 1, x: 720 - 176, y: 416 });
  });

  it('moves the frame up above the sheet of a phone', () => {
    const frame = viewFrame(390, 844, { ...OPEN, lift: sheetLift(844) });
    expect(frame.y).toBeCloseTo(422 - VIEW_OFFSET_Y - (0.3 * 844 - 20), 9);
  });
});

describe('viewOffset', () => {
  it('gives the view offset of the bar for the frame with no cover', () => {
    expect(viewOffset(1440, 900, viewFrame(1440, 900, OPEN))).toEqual([
      1440,
      900,
      0,
      VIEW_OFFSET_Y,
      1440,
      900,
    ]);
  });

  it('shows the middle of the frame at its place on the canvas', () => {
    const frame = { scale: 1, x: 500, y: 380 };
    const [x, y] = throughCamera(viewOffset(1440, 900, frame), 0, 0);
    expect(x).toBeCloseTo(500, 6);
    expect(y).toBeCloseTo(380, 6);
  });
});

import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  BAR_COVER,
  DRAWER_COVER,
  NO_CLEAR,
  boxOnCanvas,
  clearFirstScreen,
  clearedFrame,
  frameBox,
  sheetLift,
  viewFrame,
  viewOffset,
} from './frame.ts';
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

  it('fits the full frame of a close shot into the free area (review of step 8, M4)', () => {
    const bar = viewFrame(1440, 900, OPEN, 1);
    expect(bar.scale).toBeCloseTo((900 - BAR_COVER) / 900, 9);
    const drawer = viewFrame(1440, 900, { ...OPEN, right: DRAWER_COVER }, 1);
    expect(drawer.scale).toBeCloseTo(1088 / 1440, 9);
    for (const [frame, right] of [
      [bar, 0],
      [drawer, DRAWER_COVER],
    ] as const) {
      const box = frameBox(1440, 900, frame);
      expect(box.left).toBeGreaterThanOrEqual(-1e-9);
      expect(box.top).toBeGreaterThanOrEqual(-1e-9);
      expect(box.right).toBeLessThanOrEqual(1440 - right + 1e-9);
      expect(box.bottom).toBeLessThanOrEqual(900 - BAR_COVER + 1e-9);
    }
    // A share of the fit, as in the glide to Free mode, scales the frame by that share.
    expect(viewFrame(1440, 900, OPEN, 0.5).scale).toBeCloseTo(1 - 0.5 * (BAR_COVER / 900), 9);
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

  it('puts a box of the units of the view where the camera shows it', () => {
    const frame = { scale: 0.8, x: 500, y: 380 };
    const args = viewOffset(1440, 900, frame);
    const box = boxOnCanvas({ left: -1, bottom: -0.5, right: 0.25, top: 1 }, 1440, 900, frame);
    const [left, top] = throughCamera(args, -1, 1);
    const [right, bottom] = throughCamera(args, 0.25, -0.5);
    expect(left).toBeCloseTo(box.left, 6);
    expect(top).toBeCloseTo(box.top, 6);
    expect(right).toBeCloseTo(box.right, 6);
    expect(bottom).toBeCloseTo(box.bottom, 6);
  });

  it('shows the frame where frameBox() puts it', () => {
    const frame = { scale: 0.8, x: 500, y: 380 };
    const args = viewOffset(1440, 900, frame);
    const box = frameBox(1440, 900, frame);
    const [left, top] = throughCamera(args, -1, 1);
    const [right, bottom] = throughCamera(args, 1, -1);
    expect(left).toBeCloseTo(box.left, 6);
    expect(top).toBeCloseTo(box.top, 6);
    expect(right).toBeCloseTo(box.right, 6);
    expect(bottom).toBeCloseTo(box.bottom, 6);
  });
});

describe('clearFirstScreen (design 2.2, 2.8)', () => {
  const stage = { left: 100, top: 120, right: 1300, bottom: 740 };

  it('shrinks the stage toward its top until its front edge clears a ring below it', () => {
    const ring = { left: 672, top: 600, right: 768, bottom: 696 };
    const clear = clearFirstScreen(stage, ring);
    expect(clear.x).toBe(700);
    expect(clear.y).toBe(120);
    const frame = clearedFrame({ scale: 1, x: 700, y: 416 }, clear);
    // The bottom of the stage moves to 12 px above the ring.
    expect(clear.y + (stage.bottom - clear.y) * clear.factor).toBeCloseTo(588, 9);
    expect(frame.scale).toBeCloseTo(clear.factor, 9);
    expect(frame.y).toBeCloseTo(120 + (416 - 120) * clear.factor, 9);
  });

  it('shrinks the stage toward its left edge until it clears a ring at its right', () => {
    const ring = { left: 1150, top: 300, right: 1246, bottom: 396 };
    const clear = clearFirstScreen(stage, ring);
    expect(clear.x).toBe(100);
    expect(clear.y).toBe(430);
    expect(clear.x + (stage.right - clear.x) * clear.factor).toBeCloseTo(1138, 9);
  });

  it('keeps a stage that is clear of the ring', () => {
    const ring = { left: 672, top: 760, right: 768, bottom: 856 };
    expect(clearFirstScreen(stage, ring).factor).toBe(1);
    expect(clearedFrame({ scale: 1, x: 3, y: 4 }, NO_CLEAR)).toEqual({ scale: 1, x: 3, y: 4 });
  });
});

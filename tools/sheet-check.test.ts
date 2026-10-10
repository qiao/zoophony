import { describe, expect, it } from 'vitest';

import { VIEW_SHEETS } from '../src/gallery/sheets.ts';
import {
  IGNORED,
  colorStats,
  differenceImage,
  largestDiffs,
  matchViews,
  rowDiffs,
  rowRuns,
  viewColumns,
  viewExtents,
} from './sheet-check.ts';

describe('viewColumns', () => {
  it('puts the borders of the views in the middle between their seats, in device pixels', () => {
    const columns = viewColumns(VIEW_SHEETS.fox);
    expect(columns[0]).toBe(0);
    expect(columns[1]).toBe(Math.round((385 + 1100) / 2));
    expect(columns[2]).toBe(Math.round((1100 + 2080) / 2));
    expect(columns[3]).toBe(2494);
  });
});

describe('matchViews', () => {
  // One row of 6 pixels: two pixels for each view.
  const columns = [0, 2, 4, 6] as const;

  it('gives the IoU of each view, and leaves out the ignored pixels', () => {
    const matte = Uint8Array.from([255, 255, 255, 0, IGNORED, 255]);
    const silhouette = Uint8Array.from([255, 0, 255, 255, 255, 255]);
    const [front, side, back] = matchViews(matte, silhouette, 6, columns);

    expect(front).toEqual({ view: 'front', iou: 0.5, sheetOnly: 0.5, modelOnly: 0 });
    expect(side).toEqual({ view: 'side', iou: 0.5, sheetOnly: 0, modelOnly: 1 });
    expect(back).toEqual({ view: 'back', iou: 1, sheetOnly: 0, modelOnly: 0 });
  });

  it('refuses images of different sizes', () => {
    expect(() => matchViews(new Uint8Array(6), new Uint8Array(5), 6, columns)).toThrow();
  });
});

describe('differenceImage', () => {
  it('colors both, the sheet only, the model only, the ignored pixels, and the background', () => {
    const matte = Uint8Array.from([255, 255, 0, IGNORED, 0]);
    const silhouette = Uint8Array.from([255, 0, 255, 255, 0]);
    const pixels = [...differenceImage(matte, silhouette)];

    expect(pixels.slice(0, 4)).toEqual([150, 150, 150, 255]);
    expect(pixels.slice(4, 8)).toEqual([230, 60, 60, 255]);
    expect(pixels.slice(8, 12)).toEqual([60, 110, 240, 255]);
    expect(pixels.slice(12, 16)).toEqual([70, 30, 70, 255]);
    expect(pixels.slice(16, 20)).toEqual([40, 40, 40, 255]);
  });
});

describe('rowRuns, rowDiffs, and viewExtents', () => {
  // Two rows of 6 pixels, one view of 6 columns in each image, with the seat at column 3.
  const columns = [0, 6, 6, 6] as const;
  const seats = [3, 6, 6] as const;

  it('gives the runs of a mask in one row', () => {
    const values = Uint8Array.from([255, 255, 0, 255, 0, 255]);
    expect(rowRuns((p) => (values[p] ?? 0) >= 200, 0, 6, 0, 6)).toEqual([
      [0, 1],
      [3, 3],
      [5, 5],
    ]);
  });

  it('counts the different pixels of each row on each side of the seat', () => {
    const matte = Uint8Array.from([0, 255, 255, 255, 0, 0, 0, 0, IGNORED, 255, 0, 0]);
    const page = Uint8Array.from([255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 0]);

    expect(rowDiffs(matte, page, 6, columns, seats)).toEqual([
      { view: 'front', row: 0, sheetOnly: [0, 1], modelOnly: [1, 0] },
      // The ignored pixel does not count.
      { view: 'front', row: 1, sheetOnly: [0, 0], modelOnly: [0, 1] },
    ]);
  });

  it('gives the top and the bottom row of each view', () => {
    const matte = Uint8Array.from([0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const page = Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0]);
    const [front, side] = viewExtents(matte, page, 6, columns);

    expect(front).toEqual({ view: 'front', sheet: [0, 0], page: [1, 1] });
    expect(side).toEqual({ view: 'side', sheet: [-1, -1], page: [-1, -1] });
  });
});

describe('colorStats', () => {
  it('gives the medians and the percentiles of the value of the pixels inside the mask', () => {
    // Four pixels in one view: three inside the mask.
    const rgba = Uint8Array.from([
      100, 50, 20, 255, 120, 60, 30, 255, 140, 70, 40, 255, 255, 255, 255, 255,
    ]);
    const mask = Uint8Array.from([255, 255, 255, 0]);
    const [front] = colorStats(rgba, mask, 4, [0, 4, 4, 4]);

    expect(front).toEqual({ view: 'front', count: 3, median: [120, 60, 30], value: [100, 140] });
  });
});

describe('largestDiffs', () => {
  it('picks the rows with the most different pixels, at least some rows apart', () => {
    const diff = (row: number, count: number) => ({
      view: 'front' as const,
      row,
      sheetOnly: [count, 0] as const,
      modelOnly: [0, 0] as const,
    });
    const diffs = [diff(10, 5), diff(11, 9), diff(30, 7), diff(50, 1)];

    expect(largestDiffs(diffs, 'front', 2, 5).map((d) => d.row)).toEqual([11, 30]);
  });
});

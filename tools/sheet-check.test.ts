import { describe, expect, it } from 'vitest';

import { VIEW_SHEETS } from '../src/gallery/sheets.ts';
import { IGNORED, differenceImage, matchViews, viewColumns } from './sheet-check.ts';

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

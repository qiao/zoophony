import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { VIEW_SHEETS, isSheetId, matteOf, sheetOf, sheetTurn } from './sheets.ts';
import { viewTurn } from './views.ts';

/** The difference of two turns around y, from -π to π. */
function turnDifference(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

describe('sheetOf', () => {
  it('reads the sheet from the query, and gives null for no sheet or another name', () => {
    expect(sheetOf('?sheet=fox')).toBe(VIEW_SHEETS.fox);
    expect(sheetOf('?sheet=polar-bear')).toBe(VIEW_SHEETS['polar-bear']);
    expect(sheetOf('')).toBeNull();
    expect(sheetOf('?sheet=wolf')).toBeNull();
  });
});

describe('isSheetId', () => {
  it('accepts the name of each sheet, and no other text', () => {
    for (const id of Object.keys(VIEW_SHEETS)) {
      expect(isSheetId(id), id).toBe(true);
    }
    expect(isSheetId('wolf')).toBe(false);
    expect(isSheetId('toString')).toBe(false);
    expect(isSheetId('')).toBe(false);
    expect(isSheetId(null)).toBe(false);
    expect(isSheetId(undefined)).toBe(false);
  });
});

describe('matteOf', () => {
  it('asks for the silhouette only when the query has the key matte', () => {
    expect(matteOf('?sheet=fox&matte')).toBe(true);
    expect(matteOf('?matte=1&sheet=fox')).toBe(true);
    expect(matteOf('?sheet=fox')).toBe(false);
    expect(matteOf('')).toBe(false);
  });
});

describe('sheetTurn', () => {
  it('gives the turns of the front, the right side, and the back of the rows page', () => {
    const turn = (turnDeg: number): number =>
      sheetTurn({ turnDeg, x: 0, floor: 0, showInstrument: true });
    expect(turnDifference(turn(0), viewTurn('front'))).toBeCloseTo(0, 9);
    expect(turnDifference(turn(90), viewTurn('side'))).toBeCloseTo(0, 9);
    expect(turnDifference(turn(180), viewTurn('back'))).toBeCloseTo(0, 9);
  });
});

describe('VIEW_SHEETS (design 7.1)', () => {
  it('shows the species and the instrument of each sheet', () => {
    expect(
      Object.values(VIEW_SHEETS).map((sheet) => `${sheet.species} ${sheet.instrument}`),
    ).toEqual(['fox-red violin', 'rabbit violin', 'dog cello', 'polar-bear piano', 'bear baton']);
  });

  it('has the size of the sheet image, and keeps each view on the page from left to right', () => {
    for (const [id, sheet] of Object.entries(VIEW_SHEETS)) {
      // The width and the height of a PNG file are the big-endian numbers at bytes 16 and 20.
      const png = readFileSync(new URL(`../../docs/reference/${sheet.file}`, import.meta.url));
      const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      expect(sheet.width * sheet.sheetScale, id).toBe(width);
      expect(sheet.height * sheet.sheetScale, id).toBe(height);
      const columns = sheet.views.map((view) => view.x);
      expect(columns).toEqual(columns.toSorted((a, b) => a - b));
      for (const view of sheet.views) {
        expect(view.x).toBeGreaterThan(0);
        expect(view.x).toBeLessThan(sheet.width);
        expect(view.floor).toBeGreaterThan(sheet.height / 2);
        expect(view.floor).toBeLessThan(sheet.height);
      }
    }
  });
});

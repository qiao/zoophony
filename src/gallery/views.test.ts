import { describe, expect, it } from 'vitest';

import { VIEWS_PAGE_SIZE, VIEW_ROWS, viewTurn } from './views.ts';

/** Turns the forward direction of a model (-z) around y, as three.js does. */
function forward(turn: number): [number, number] {
  // A turn around y moves (x, z) to (x cos + z sin, -x sin + z cos).
  return [-Math.sin(turn), -Math.cos(turn)];
}

describe('viewTurn', () => {
  it('turns the face to the camera, to the right edge, and away from the camera', () => {
    const [fx, fz] = forward(viewTurn('front'));
    expect(fx).toBeCloseTo(0, 9);
    expect(fz).toBeCloseTo(1, 9);
    const [sx, sz] = forward(viewTurn('side'));
    expect(sx).toBeCloseTo(1, 9);
    expect(sz).toBeCloseTo(0, 9);
    const [bx, bz] = forward(viewTurn('back'));
    expect(bx).toBeCloseTo(0, 9);
    expect(bz).toBeCloseTo(-1, 9);
  });
});

describe('VIEW_ROWS', () => {
  it('shows the models of animals.webp in its three rows (design 7.1)', () => {
    expect(VIEW_ROWS.map((row) => row.title)).toEqual(['RABBITS', 'FOXES', 'OTHER ANIMALS']);
    expect(
      VIEW_ROWS.flatMap((row) => row.groups.map((g) => `${g.species} ${g.instrument}`)),
    ).toEqual([
      'rabbit violin',
      'rabbit clarinet',
      'fox-red violin',
      'fox-red clarinet',
      'wolf clarinet',
      'bear baton',
      'elephant cello',
    ]);
  });

  it('keeps each view and each label on the page, in order from left to right', () => {
    let previousFloor = 0;
    for (const row of VIEW_ROWS) {
      expect(row.top).toBeLessThan(row.floor);
      expect(row.floor).toBeLessThan(row.labelTop);
      expect(row.titleTop).toBeGreaterThan(previousFloor);
      expect(row.labelTop).toBeLessThan(VIEWS_PAGE_SIZE);
      previousFloor = row.labelTop;
      const centers = row.groups.flatMap((group) => group.centers);
      expect(centers).toEqual(centers.toSorted((a, b) => a - b));
      expect(Math.min(...centers)).toBeGreaterThan(0);
      expect(Math.max(...centers)).toBeLessThan(VIEWS_PAGE_SIZE);
    }
  });
});

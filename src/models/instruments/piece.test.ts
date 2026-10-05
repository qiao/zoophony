import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../tuples.ts';
import { transform, triangleNormal } from '../mesh.ts';
import { box } from '../primitives.ts';
import {
  PieceBuilder,
  hold,
  pieceBounds,
  pieceSize,
  placeCorners,
  triangleCount,
} from './piece.ts';

/** Checks that each face of a box at the origin points away from its center. */
function expectOutside(corners: readonly number[]): void {
  for (let t = 0; t < corners.length / 9; t++) {
    const center: Vec3 = [
      ((corners[t * 9] ?? 0) + (corners[t * 9 + 3] ?? 0) + (corners[t * 9 + 6] ?? 0)) / 3,
      ((corners[t * 9 + 1] ?? 0) + (corners[t * 9 + 4] ?? 0) + (corners[t * 9 + 7] ?? 0)) / 3,
      ((corners[t * 9 + 2] ?? 0) + (corners[t * 9 + 5] ?? 0) + (corners[t * 9 + 8] ?? 0)) / 3,
    ];
    expect(new Vector3(...triangleNormal(corners, t)).dot(new Vector3(...center))).toBeGreaterThan(
      0,
    );
  }
}

describe('placeCorners', () => {
  it('moves each corner and keeps the faces outside', () => {
    const placed = placeCorners(box(1, 1, 1), transform([0, 0, 0], undefined, [2, 1, 1]));
    expect(Math.max(...placed.filter((_, i) => i % 3 === 0))).toBe(1);
    expectOutside(placed);
  });

  it('keeps the faces outside after a mirror scale', () => {
    const placed = placeCorners(box(1, 1, 1), transform([0, 0, 0], undefined, [-1, 1, 1]));
    expectOutside(placed);
  });
});

describe('PieceBuilder', () => {
  it('scales all parts after their placement', () => {
    const piece = new PieceBuilder(2);
    piece.add(box(1, 1, 1), [1, 0, 0], transform([1, 0, 0]));
    piece.add(box(1, 1, 1), [0, 0, 1], undefined, 'metal');
    const built = piece.build('malletL', hold('palmL'));
    expect(built.bone).toBe('malletL');
    expect(built.hold.anchor).toBe('palmL');
    expect(built.parts.map((p) => p.group)).toEqual(['matte', 'metal']);
    expect(pieceBounds(built)).toEqual({ min: [-1, -1, -1], max: [3, 1, 1] });
    expect(pieceSize(built)).toEqual([4, 2, 2]);
    expect(triangleCount([built, built])).toBe(48);
  });

  it('adds a rod and a bar between two points', () => {
    const piece = new PieceBuilder();
    piece.rod([0, 0, 0], [0, 0, 2], 0.1, 4, [1, 1, 1]);
    piece.bar([1, 1, 0], [1, 3, 0], 0.2, 0.4, [1, 1, 1]);
    const [rod, bar] = piece.build('instrument', hold('floor')).parts;
    const extent = (corners: readonly number[], axis: number): [number, number] => {
      const values = corners.filter((_, i) => i % 3 === axis);
      return [Math.min(...values), Math.max(...values)];
    };
    expect(extent(rod?.corners ?? [], 2)[0]).toBeCloseTo(0, 9);
    expect(extent(rod?.corners ?? [], 2)[1]).toBeCloseTo(2, 9);
    expect(extent(bar?.corners ?? [], 0)).toEqual([0.9, 1.1]);
    expect(extent(bar?.corners ?? [], 1)).toEqual([1, 3]);
    expect(extent(bar?.corners ?? [], 2)).toEqual([-0.2, 0.2]);
  });
});

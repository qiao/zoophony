import { describe, expect, it } from 'vitest';

import { centeredBox } from './bounds.ts';
import {
  STAND_FOOTPRINT,
  boxesTouch,
  footprintOf,
  obstacleOf,
  obstaclesTouch,
  placeFootprint,
  playerFootprint,
} from './footprint.ts';
import { CHAIR, HIGH_STOOL } from './props.ts';

/** A footprint of one box of 1 × 1 × 1 m on the floor, centered on the origin. */
const CUBE = footprintOf([centeredBox([0, 0.5, 0], [1, 1, 1])]);

describe('placeFootprint', () => {
  it('turns the boxes around y as three.js does', () => {
    // A box 1 m in front of the origin (-z) goes to +x when the item faces -π/2.
    const ahead = footprintOf([centeredBox([0, 0.5, -1], [0.2, 1, 0.2])]);
    const [box] = placeFootprint(ahead, [2, 0, 3], -Math.PI / 2);
    expect(box?.x).toBeCloseTo(3, 9);
    expect(box?.z).toBeCloseTo(3, 9);
    const [lifted] = placeFootprint(ahead, [0, 0.25, 0], 0);
    expect(lifted?.minY).toBeCloseTo(0.25, 9);
  });
});

describe('boxesTouch', () => {
  it('finds two boxes apart along an axis, and closer than the gap', () => {
    const [a] = placeFootprint(CUBE, [0, 0, 0], 0);
    const [b] = placeFootprint(CUBE, [1.1, 0, 0], 0);
    if (!a || !b) {
      throw new Error('No boxes.');
    }
    expect(boxesTouch(a, b, 0)).toBe(false);
    expect(boxesTouch(a, b, 0.2)).toBe(true);
  });

  it('separates a turned box only along a diagonal axis', () => {
    // A cube turned 45° reaches 0.707 m from its center along x.
    const [a] = placeFootprint(CUBE, [0, 0, 0], 0);
    const [turned] = placeFootprint(CUBE, [1.15, 0, 0], Math.PI / 4);
    const [near] = placeFootprint(CUBE, [1.2, 0, 0.6], Math.PI / 4);
    if (!a || !turned || !near) {
      throw new Error('No boxes.');
    }
    expect(boxesTouch(a, turned, 0)).toBe(true);
    // At (1.2, 0.6), the corner of the turned cube misses the first cube: only the diagonal axes
    // of the turned cube separate them.
    expect(boxesTouch(a, near, 0)).toBe(false);
  });

  it('finds boxes at different heights apart', () => {
    const [a] = placeFootprint(CUBE, [0, 0, 0], 0);
    const [above] = placeFootprint(CUBE, [0, 1, 0], 0);
    if (!a || !above) {
      throw new Error('No boxes.');
    }
    expect(boxesTouch(a, above, 0)).toBe(false);
  });
});

describe('obstaclesTouch', () => {
  it('checks each pair of boxes of two obstacles', () => {
    const a = obstacleOf('a', placeFootprint(CUBE, [0, 0, 0], 0));
    const two = footprintOf([
      centeredBox([0, 0.5, 0], [1, 1, 1]),
      centeredBox([-1.2, 0.5, 0], [1, 1, 1]),
    ]);
    expect(obstaclesTouch(a, obstacleOf('b', placeFootprint(two, [2.25, 0, 0], 0)), 0)).toBe(false);
    expect(obstaclesTouch(a, obstacleOf('b', placeFootprint(two, [2.15, 0, 0], 0)), 0)).toBe(true);
  });
});

describe('playerFootprint', () => {
  it('holds the seat and splits the player into boxes of bones and heights', () => {
    const cello = playerFootprint('elephant', 'cello', 4);
    // The box of the chair reaches back to the back of the seat.
    expect(cello.boxes.some((b) => Math.abs(b.max[2] - CHAIR.seatDepth / 2) < 1e-6)).toBe(true);
    expect(cello.bounds.max[1]).toBeGreaterThan(1.5);
    // The end pin of the cello stands in front of the player.
    expect(cello.bounds.min[2]).toBeLessThan(-0.7);
    expect(cello.boxes.length).toBeGreaterThan(40);
    const bass = playerFootprint('hippo', 'contrabass', 4);
    expect(bass.boxes.some((b) => Math.abs(b.max[1] - HIGH_STOOL.seatHeight) < 1e-6)).toBe(true);
  });

  it('gives the timpani the width of its kettles (design 4.6)', () => {
    const timpani = playerFootprint('badger', 'timpani', 4);
    expect(timpani.bounds.max[0] - timpani.bounds.min[0]).toBeGreaterThan(1.8);
  });
});

describe('STAND_FOOTPRINT', () => {
  it('has a box for each leg, the post, and the desk', () => {
    expect(STAND_FOOTPRINT.boxes).toHaveLength(5);
    const heights = STAND_FOOTPRINT.boxes.map((b) => b.max[1]).toSorted((a, b) => a - b);
    expect(heights[2]).toBeLessThan(0.15);
    expect(heights[4]).toBeGreaterThan(1.1);
  });
});

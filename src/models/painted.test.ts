import { describe, expect, it } from 'vitest';

import { FINISH_ORDER, MeshBuilder, srgb } from './mesh.ts';
import { addPainted, jitter } from './painted.ts';
import { box } from './primitives.ts';
import { boneIndex } from './rig.ts';

describe('addPainted', () => {
  it('colors each triangle from its centroid and its normal, and keeps the triangles on the bone', () => {
    const top = srgb('#ffffff');
    const side = srgb('#000000');
    const corners = box(1, 1, 1);
    const builder = new MeshBuilder();
    addPainted(builder, corners, 'chest', (_, normal) => (normal[1] > 0.5 ? top : side));
    const mesh = builder.build();

    expect(mesh.positions.length).toBe(corners.length);
    expect([...mesh.bones].every((bone) => bone === boneIndex('chest'))).toBe(true);
    expect([...mesh.finishes].every((finish) => FINISH_ORDER[finish] === 'matte')).toBe(true);
    // The two triangles of the top face are white, and the ten others are black.
    let white = 0;
    for (let t = 0; t < mesh.positions.length / 9; t++) {
      const y = [0, 1, 2].map((k) => mesh.positions[t * 9 + k * 3 + 1] ?? 0);
      const color = Array.from(mesh.colors.slice(t * 9, t * 9 + 3));
      const up = y.every((v) => v > 0.49);
      expect(color).toEqual(up ? top : side);
      white += up ? 1 : 0;
    }
    expect(white).toBe(2);
  });
});

describe('jitter', () => {
  it('gives the same offset for the same indices, from -1 to 1', () => {
    const offsets = Array.from({ length: 50 }, (_, i) => jitter(i, 3 * i + 1));
    expect(offsets).toEqual(Array.from({ length: 50 }, (_, i) => jitter(i, 3 * i + 1)));
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(1);
    expect(new Set(offsets).size).toBeGreaterThan(40);
  });
});

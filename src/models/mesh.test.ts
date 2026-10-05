import { describe, expect, it } from 'vitest';

import { dot, transform } from './math.ts';
import { MeshBuilder, splitByFacing, srgb, triangleNormal } from './mesh.ts';
import { box } from './primitives.ts';

describe('srgb', () => {
  it('converts a hex color to linear values', () => {
    const [r, g, b] = srgb('#ff8000');
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0.2158605, 6);
    expect(b).toBe(0);
  });
});

describe('MeshBuilder', () => {
  it('puts the matte triangles before the metal triangles', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [0, 0, 1], group: 'metal', bone: 3 });
    builder.add(box(1, 1, 1), { color: [1, 0, 0], bone: 2 });
    const mesh = builder.build();

    expect(builder.triangleCount).toBe(24);
    expect(mesh.matteTriangles).toBe(12);
    expect(mesh.positions).toHaveLength(24 * 9);
    expect(mesh.colors[0]).toBe(1);
    expect(mesh.colors.at(-1)).toBe(1);
    expect(mesh.bones[0]).toBe(2);
    expect(mesh.bones.at(-1)).toBe(3);
  });

  it('keeps the faces outside under a mirror scale', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), {
      color: [1, 1, 1],
      at: transform([5, 0, 0], undefined, [-1, 1, 1]),
    });
    const positions = [...builder.build().positions];
    for (let t = 0; t < 12; t++) {
      const n = triangleNormal(positions, t);
      const center = [0, 1, 2].map(
        (axis) =>
          ((positions[t * 9 + axis] ?? 0) +
            (positions[t * 9 + 3 + axis] ?? 0) +
            (positions[t * 9 + 6 + axis] ?? 0)) /
          3,
      );
      expect(dot(n, [(center[0] ?? 0) - 5, center[1] ?? 0, center[2] ?? 0])).toBeGreaterThan(0);
    }
  });
});

describe('MeshBuilder.addMesh', () => {
  it('places a built mesh and keeps its colors, bones, and groups', () => {
    const part = new MeshBuilder();
    part.add(box(1, 1, 1), { color: [0, 1, 0], group: 'metal', bone: 4 });
    part.add(box(1, 1, 1), { color: [1, 0, 0], bone: 2 });
    const data = part.build();
    const merged = new MeshBuilder();
    merged.add(box(1, 1, 1), { color: [0, 0, 1], group: 'metal' });
    merged.addMesh(data, transform([10, 0, 0]));
    const mesh = merged.build();

    expect(mesh.matteTriangles).toBe(12);
    expect(mesh.positions).toHaveLength(36 * 9);
    // The matte box of the placed mesh comes first, at x = 10.
    expect(mesh.positions[0]).toBeGreaterThan(9);
    expect(mesh.colors[0]).toBe(1);
    expect(mesh.bones[0]).toBe(2);
    // The metal triangles follow: first the own box, then the placed metal box.
    expect(mesh.colors[12 * 9 + 2]).toBe(1);
    expect(mesh.bones.at(-1)).toBe(4);
    expect(mesh.colors.at(-2)).toBe(1);
    expect(mesh.positions.at(-3)).toBeGreaterThan(9);
  });
});

describe('splitByFacing', () => {
  it('finds the faces that point in a direction', () => {
    const [front, rest] = splitByFacing(box(1, 1, 1), [0, 0, -1], 0.5);
    expect(front.length / 9).toBe(2);
    expect(rest.length / 9).toBe(10);
  });
});

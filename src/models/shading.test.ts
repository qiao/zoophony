import { describe, expect, it } from 'vitest';

import { MeshBuilder, splitByCentroid, transform } from './mesh.ts';
import type { MeshData } from './mesh.ts';
import { box, cylinder } from './primitives.ts';
import { creaseNormals, weldCorners } from './shading.ts';

/** Reads the normal of one corner. */
function normalAt(normals: Float32Array, corner: number): [number, number, number] {
  return [normals[corner * 3] ?? 0, normals[corner * 3 + 1] ?? 0, normals[corner * 3 + 2] ?? 0];
}

/** Gives the corners of a mesh whose position is near a point. */
function cornersAt(mesh: MeshData, point: readonly [number, number, number]): number[] {
  const found: number[] = [];
  for (let c = 0; c < mesh.bones.length; c++) {
    const d = Math.hypot(
      (mesh.positions[c * 3] ?? 0) - point[0],
      (mesh.positions[c * 3 + 1] ?? 0) - point[1],
      (mesh.positions[c * 3 + 2] ?? 0) - point[2],
    );
    if (d < 1e-6) {
      found.push(c);
    }
  }
  return found;
}

/**
 * A corner on the top rim of `cylinder(1, 1, 1, 16)`. The lathe turns its rings by half a side,
 * so its corners are at 11.25° plus a multiple of 22.5° from +z toward +x.
 */
const RIM = [Math.sin(Math.PI / 16), 1, Math.cos(Math.PI / 16)] as const;

/** Splits the faces of the cylinder at the corner {@link RIM}. */
function atSeam([x, , z]: readonly [number, number, number]): boolean {
  return Math.atan2(x, z) < Math.PI / 16;
}

describe('weldCorners', () => {
  it('welds the corners of one bone at one point into one vertex', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1] });
    const welds = weldCorners(builder.build());
    expect(welds.start.length - 1).toBe(8);
    expect(welds.corners.length).toBe(36);
    expect(welds.start.at(-1)).toBe(36);
  });

  it('welds the corners of two bones at one point', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 1 });
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 2 });
    builder.add(box(1, 1, 1), { color: [1, 1, 1], bone: 2, at: transform([2, 0, 0]) });
    expect(weldCorners(builder.build()).start.length - 1).toBe(16);
  });
});

describe('creaseNormals', () => {
  it('keeps the hard edges of a box, whose faces turn by 90°', () => {
    const builder = new MeshBuilder();
    builder.add(box(1, 1, 1), { color: [1, 1, 1] });
    const mesh = builder.build();
    const normals = creaseNormals(mesh);
    for (let t = 0; t < 12; t++) {
      const a = normalAt(normals, t * 3);
      for (let k = 1; k < 3; k++) {
        expect(normalAt(normals, t * 3 + k)).toEqual(a);
      }
      // Each normal is a face normal: one axis only.
      expect(a.filter((value) => Math.abs(value) > 1e-6)).toHaveLength(1);
    }
  });

  it('smooths the side of a cylinder of 16 sides and keeps the edge of its cap', () => {
    const builder = new MeshBuilder();
    builder.add(cylinder(1, 1, 1, 16), { color: [1, 1, 1] });
    const mesh = builder.build();
    const normals = creaseNormals(mesh);
    // A corner on the rim: the side corners point out from the axis, the cap corners up.
    const rim = cornersAt(mesh, RIM);
    expect(rim.length).toBeGreaterThan(2);
    const side = rim.filter((c) => Math.abs(normalAt(normals, c)[1]) < 0.5);
    const cap = rim.filter((c) => Math.abs(normalAt(normals, c)[1]) >= 0.5);
    expect(side.length).toBeGreaterThan(0);
    expect(cap.length).toBeGreaterThan(0);
    for (const c of side) {
      const [x, y, z] = normalAt(normals, c);
      expect(x).toBeCloseTo(RIM[0], 5);
      expect(y).toBeCloseTo(0, 5);
      expect(z).toBeCloseTo(RIM[2], 5);
    }
    for (const c of cap) {
      expect(normalAt(normals, c)[1]).toBeCloseTo(1, 5);
    }
  });

  it('smooths the seam between the parts of two bones', () => {
    // Two halves of one cylinder on two bones, as the torso on `spine` and `chest`.
    const [left, right] = splitByCentroid(cylinder(1, 1, 1, 16), atSeam);
    const builder = new MeshBuilder();
    builder.add(left, { color: [1, 1, 1], bone: 1 });
    builder.add(right, { color: [1, 1, 1], bone: 2 });
    const mesh = builder.build();
    const normals = creaseNormals(mesh);
    const side = cornersAt(mesh, RIM).filter((c) => Math.abs(normalAt(normals, c)[1]) < 0.5);
    expect(side.length).toBeGreaterThan(1);
    for (const c of side) {
      const [x, , z] = normalAt(normals, c);
      expect(x * RIM[0] + z * RIM[2]).toBeCloseTo(1, 5);
    }
  });

  it('smooths across the color split of a part on one bone', () => {
    const [left, right] = splitByCentroid(cylinder(1, 1, 1, 16), atSeam);
    const builder = new MeshBuilder();
    builder.add(left, { color: [1, 1, 1] });
    builder.add(right, { color: [0, 0, 0] });
    const mesh = builder.build();
    const normals = creaseNormals(mesh);
    const side = cornersAt(mesh, RIM).filter((c) => Math.abs(normalAt(normals, c)[1]) < 0.5);
    expect(side.length).toBeGreaterThan(1);
    for (const c of side) {
      const [x, , z] = normalAt(normals, c);
      expect(x * RIM[0] + z * RIM[2]).toBeCloseTo(1, 5);
    }
  });

  it('gives each corner a unit normal', () => {
    const builder = new MeshBuilder();
    builder.add(cylinder(1, 0.5, 2, 10), { color: [1, 1, 1], finish: 'metal' });
    builder.add(box(1, 2, 3), { color: [1, 1, 1], at: transform([3, 0, 0]) });
    const normals = creaseNormals(builder.build());
    for (let c = 0; c < normals.length / 3; c++) {
      expect(Math.hypot(...normalAt(normals, c))).toBeCloseTo(1, 5);
    }
  });
});

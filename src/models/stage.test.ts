import { describe, expect, it } from 'vitest';

import { SCENE_COLORS } from './colors.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { triangleNormal } from './mesh.ts';
import { buildPodium, buildStage } from './stage.ts';
import type { Vec3 } from './math.ts';

interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Compares the color of a vertex with a color, at the 32-bit precision of the mesh data. */
function sameColor(mesh: MeshData, vertex: number, color: Rgb): boolean {
  return color.every((c, i) => mesh.colors[vertex * 3 + i] === Math.fround(c));
}

/** Finds the bounds of the vertices of one color. */
function boundsOf(mesh: MeshData, color: Rgb): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    if (!sameColor(mesh, v, color)) {
      continue;
    }
    for (let axis = 0; axis < 3; axis++) {
      const p = mesh.positions[v * 3 + axis] ?? 0;
      min[axis] = Math.min(min[axis] ?? 0, p);
      max[axis] = Math.max(max[axis] ?? 0, p);
    }
  }
  return { min, max };
}

/** Sums the area of the up-facing triangles at y = 0 inside the stage square. */
function topArea(mesh: MeshData, side: number): number {
  const corners = [...mesh.positions];
  let area = 0;
  for (let t = 0; t < corners.length / 9; t++) {
    const ys = [1, 4, 7].map((k) => corners[t * 9 + k] ?? 1);
    const xs = [0, 3, 6].map((k) => Math.abs(corners[t * 9 + k] ?? 0));
    const zs = [2, 5, 8].map((k) => Math.abs(corners[t * 9 + k] ?? 0));
    const flatTop = ys.every((y) => y === 0);
    const inside = [...xs, ...zs].every((c) => c <= side / 2 + 1e-6);
    const n = triangleNormal(corners, t);
    if (flatTop && inside && n[1] > 0) {
      area += n[1] / 2;
    }
  }
  return area;
}

/** Gives the podium center of a layout with no piano: 1.0 m behind the front edge (design 4.5). */
function frontPodium(side: number): Vec3 {
  return [0, 0, side / 2 - 1.0];
}

describe('buildStage', () => {
  for (const side of [5, 6.6, 12.3]) {
    it(`makes a slab of side ${side} and 0.40 thick (design 4.5)`, () => {
      const mesh = buildStage(side, frontPodium(side));
      const slab = boundsOf(mesh, SCENE_COLORS.plankLine);
      // The outer plank lines are less than one plank from the edges.
      expect(slab.min[0]).toBeGreaterThan(-side / 2);
      expect(slab.min[0]).toBeLessThan(-side / 2 + 0.2);
      expect(slab.max[0]).toBeLessThan(side / 2);
      expect(slab.max[0]).toBeGreaterThan(side / 2 - 0.2);
      expect(slab.min[2]).toBeCloseTo(-side / 2, 5);
      expect(slab.max[2]).toBeCloseTo(side / 2, 5);

      const sides = boundsOf(mesh, SCENE_COLORS.stageSide);
      expect(sides.min[1]).toBeCloseTo(-0.4, 5);
      expect(sides.max[1]).toBeCloseTo(0, 5);
    });

    it(`covers the top of a stage of side ${side} with planks and plank lines`, () => {
      expect(topArea(buildStage(side, frontPodium(side)), side)).toBeCloseTo(side * side, 3);
    });
  }

  it('makes planks of 0.20 that run from the front to the back (design 4.5)', () => {
    const mesh = buildStage(8, frontPodium(8));
    const lines = boundsOf(mesh, SCENE_COLORS.plankLine);
    // 40 planks have 39 lines between them.
    let lineTriangles = 0;
    for (let t = 0; t < mesh.positions.length / 9; t++) {
      if (sameColor(mesh, t * 3, SCENE_COLORS.plankLine)) {
        lineTriangles++;
      }
    }
    expect(lineTriangles).toBe(39 * 2);
    expect(lines.min[2]).toBeCloseTo(-4, 5);
    expect(lines.max[2]).toBeCloseTo(4, 5);
    expect(lines.min[0]).toBeCloseTo(-3.8 - 0.006, 5);
  });

  it('puts three steps at the front edge, 0.4 m to the left of the podium', () => {
    const side = 6.6;
    const mesh = buildStage(side, frontPodium(side));
    const sides = boundsOf(mesh, SCENE_COLORS.stageSide);
    // The steps are the only dark parts in front of the stage.
    expect(sides.max[2]).toBeCloseTo(side / 2 + 3 * 0.3, 5);

    const stepCorners: number[][] = [];
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      const z = mesh.positions[v * 3 + 2] ?? 0;
      if (z > side / 2 + 1e-6) {
        stepCorners.push([0, 1, 2].map((axis) => mesh.positions[v * 3 + axis] ?? 0));
      }
    }
    const xs = stepCorners.map((p) => p[0] ?? 0);
    expect(Math.min(...xs)).toBeCloseTo(-0.4 - 0.5, 5);
    expect(Math.max(...xs)).toBeCloseTo(-0.4 + 0.5, 5);
    const tops = new Set(stepCorners.map((p) => Math.round((p[1] ?? 0) * 1000)));
    expect([...tops].toSorted((a, b) => a - b)).toEqual([-400, -300, -200, -100]);
  });

  it('gives the step treads the color of the stage top, and the rises the dark color', () => {
    const side = 6.6;
    const mesh = buildStage(side, frontPodium(side));
    const corners = [...mesh.positions];
    let treads = 0;
    for (let t = 0; t < corners.length / 9; t++) {
      const centerZ = [2, 5, 8].reduce((sum, k) => sum + (corners[t * 9 + k] ?? 0), 0) / 3;
      const inFront = centerZ > side / 2 + 1e-6;
      if (!inFront) {
        continue;
      }
      const up = triangleNormal(corners, t)[1] > 0.99 * Math.hypot(...triangleNormal(corners, t));
      expect(sameColor(mesh, t * 3, up ? SCENE_COLORS.stageTop : SCENE_COLORS.stageSide)).toBe(
        true,
      );
      treads += up ? 1 : 0;
    }
    expect(treads).toBe(3 * 2);
  });

  it('puts the podium box 1.0 m behind the front edge (design 4.5)', () => {
    const side = 6.6;
    const podium = boundsOf(buildStage(side, frontPodium(side)), SCENE_COLORS.podium);
    expect(podium.min).toEqual([
      expect.closeTo(-0.45, 5),
      expect.closeTo(0, 5),
      expect.closeTo(side / 2 - 1.0 - 0.45, 5),
    ]);
    expect(podium.max).toEqual([
      expect.closeTo(0.45, 5),
      expect.closeTo(0.25, 5),
      expect.closeTo(side / 2 - 1.0 + 0.45, 5),
    ]);
  });

  it('builds the podium and the steps at the podium of the layout', () => {
    const side = 9;
    const podium = [0, 0, side / 2 - 1.8] as const;
    const mesh = buildStage(side, podium);
    const box = boundsOf(mesh, SCENE_COLORS.podium);
    expect((box.min[2] + box.max[2]) / 2).toBeCloseTo(podium[2], 5);
    // The steps stay at the front edge, 0.4 m to the left of the podium center.
    const near = boundsOf(buildStage(side, frontPodium(side)), SCENE_COLORS.stageSide);
    expect(boundsOf(mesh, SCENE_COLORS.stageSide)).toEqual(near);
  });

  it('puts the desk of the conductor stand 1.10 m above the podium (design 4.5)', () => {
    const side = 6.6;
    const sheet = boundsOf(buildStage(side, frontPodium(side)), SCENE_COLORS.sheet);
    const middle = (sheet.min[1] + sheet.max[1]) / 2;
    expect(middle).toBeCloseTo(0.25 + 1.1, 2);
    expect(sheet.max[0] - sheet.min[0]).toBeLessThanOrEqual(0.6);
    // The score is in front of the podium center, toward the orchestra.
    expect(sheet.max[2]).toBeLessThan(side / 2 - 1.0);
  });
});

describe('buildPodium', () => {
  it('builds the podium and the conductor stand of the stage at the origin', () => {
    const podium = boundsOf(buildPodium(), SCENE_COLORS.podium);
    expect(podium.min).toEqual([-0.45, 0, -0.45].map((v) => expect.closeTo(v, 5)));
    expect(podium.max).toEqual([0.45, 0.25, 0.45].map((v) => expect.closeTo(v, 5)));
    const sheet = boundsOf(buildPodium(), SCENE_COLORS.sheet);
    expect((sheet.min[1] + sheet.max[1]) / 2).toBeCloseTo(0.25 + 1.1, 2);
    expect(sheet.max[2]).toBeLessThan(0);
  });
});

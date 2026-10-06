import { describe, expect, it } from 'vitest';

import { SCENE_COLORS } from './colors.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { triangleNormal } from './mesh.ts';
import { STAGE_COLORS } from './props.ts';
import {
  PLANK_LENGTH,
  PLANK_TONE,
  PLANK_WIDTH,
  STAGE_EDGE,
  buildPodium,
  buildStage,
  plankColor,
  plankHash,
} from './stage.ts';
import type { Vec3 } from './tuples.ts';

interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Compares the color of a vertex with a color, at the 32-bit precision of the mesh data. */
function sameColor(mesh: MeshData, vertex: number, color: Rgb): boolean {
  return color.every((c, i) => mesh.colors[vertex * 3 + i] === Math.fround(c));
}

/** Finds the bounds of the vertices of the given colors. */
function boundsOf(mesh: MeshData, ...colors: Rgb[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    if (!colors.some((color) => sameColor(mesh, v, color))) {
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

describe('plankHash', () => {
  it('gives the same number for the same input, from 0 to 1', () => {
    const values = Array.from({ length: 200 }, (_, i) => plankHash(i, i % 7));
    expect(values).toEqual(Array.from({ length: 200 }, (_, i) => plankHash(i, i % 7)));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    // The numbers spread over the range.
    expect(new Set(values.map((v) => Math.floor(v * 4))).size).toBe(4);
  });
});

describe('plankColor', () => {
  it('keeps each plank within the tone range of the mean plank color', () => {
    const tones = new Set<number>();
    for (let row = 0; row < 20; row++) {
      for (let index = 0; index < 5; index++) {
        const [r] = plankColor(row, index);
        const tone = r / STAGE_COLORS.plank[0];
        expect(Math.abs(tone - 1)).toBeLessThanOrEqual(PLANK_TONE + 1e-9);
        tones.add(Math.round(tone * 100));
      }
    }
    expect(tones.size).toBeGreaterThan(10);
  });
});

/** An up-facing triangle at y = 0: its x and z ranges, and its first vertex. */
interface TopTriangle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  vertex: number;
}

/** Lists the up-facing triangles at y = 0. */
function topTriangles(mesh: MeshData): TopTriangle[] {
  const corners = [...mesh.positions];
  const list: TopTriangle[] = [];
  for (let t = 0; t < corners.length / 9; t++) {
    const ys = [1, 4, 7].map((k) => corners[t * 9 + k] ?? 1);
    if (!ys.every((y) => y === 0) || triangleNormal(corners, t)[1] <= 0) {
      continue;
    }
    const xs = [0, 3, 6].map((k) => corners[t * 9 + k] ?? 0);
    const zs = [2, 5, 8].map((k) => corners[t * 9 + k] ?? 0);
    list.push({
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
      vertex: t * 3,
    });
  }
  return list;
}

describe('buildStage', () => {
  for (const side of [5, 6.6, 12.3]) {
    it(`makes a slab of side ${side} and 0.40 thick, with a chamfered edge (design 4.5)`, () => {
      const mesh = buildStage(side, frontPodium(side));
      const skirt = boundsOf(mesh, STAGE_COLORS.skirt, STAGE_COLORS.groove);
      expect(skirt.min[0]).toBeCloseTo(-side / 2, 5);
      expect(skirt.max[0]).toBeCloseTo(side / 2, 5);
      expect(skirt.min[2]).toBeCloseTo(-side / 2, 5);
      expect(skirt.min[1]).toBeCloseTo(-0.4, 5);
      // The steps are lower than the top of the skirt.
      expect(skirt.max[1]).toBeCloseTo(-STAGE_EDGE, 5);

      const edge = boundsOf(mesh, STAGE_COLORS.nosing);
      expect(edge.min).toEqual(
        [-side / 2, -STAGE_EDGE, -side / 2].map((v) => expect.closeTo(v, 5)),
      );
      expect(edge.max).toEqual([side / 2, 0, side / 2].map((v) => expect.closeTo(v, 5)));
    });

    it(`covers the top of a stage of side ${side} inside the edge with planks and lines`, () => {
      const inner = side - 2 * STAGE_EDGE;
      expect(topArea(buildStage(side, frontPodium(side)), side)).toBeCloseTo(inner * inner, 3);
    });
  }

  it('makes planks of 0.22 that run from the left to the right, with staggered joints', () => {
    const side = 8;
    const inner = side / 2 - STAGE_EDGE;
    const mesh = buildStage(side, frontPodium(side));
    const top = topTriangles(mesh);
    const isSeam = (vertex: number): boolean => sameColor(mesh, vertex, STAGE_COLORS.seam);
    // The lines between two rows run over the full width.
    const rows = Math.ceil((2 * inner) / PLANK_WIDTH);
    const rowLines = top.filter((t) => isSeam(t.vertex) && t.maxX - t.minX > 2 * inner - 1e-6);
    expect(rowLines).toHaveLength((rows - 1) * 2);
    // Each plank is at most as long as the longest plank, and as wide as a row or less.
    const planks = top.filter((t) => !isSeam(t.vertex));
    for (const plank of planks) {
      expect(plank.maxX - plank.minX).toBeLessThanOrEqual(PLANK_LENGTH.min + PLANK_LENGTH.extra);
      expect(plank.maxZ - plank.minZ).toBeLessThanOrEqual(PLANK_WIDTH);
    }
    // The joints of neighbor rows are at different places.
    const joints = (row: number): number[] =>
      top
        .filter((t) => isSeam(t.vertex) && t.maxX - t.minX < 0.1)
        .filter((t) => Math.abs(t.minZ - (-inner + row * PLANK_WIDTH)) < 0.02)
        .map((t) => Math.round(t.minX * 100));
    expect(joints(3).length).toBeGreaterThan(0);
    expect(joints(3)).not.toEqual(joints(4));
  });

  it('builds the same planks on each call', () => {
    const a = buildStage(8, frontPodium(8));
    const b = buildStage(8, frontPodium(8));
    expect(a.colors).toEqual(b.colors);
    expect(a.positions).toEqual(b.positions);
  });

  it('puts three steps at the front edge, 0.4 m to the left of the podium', () => {
    const side = 6.6;
    const mesh = buildStage(side, frontPodium(side));
    const sides = boundsOf(mesh, STAGE_COLORS.skirt);
    // The steps are the only skirt parts in front of the stage.
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

  it('gives the step treads the plank color, and the rises the skirt color', () => {
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
      expect(sameColor(mesh, t * 3, up ? STAGE_COLORS.plank : STAGE_COLORS.skirt)).toBe(true);
      treads += up ? 1 : 0;
    }
    expect(treads).toBe(3 * 2);
  });

  it('puts the podium box 1.0 m behind the front edge (design 4.5)', () => {
    const side = 6.6;
    const mesh = buildStage(side, frontPodium(side));
    const podium = boundsOf(mesh, STAGE_COLORS.podium, STAGE_COLORS.podiumTop);
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
    // The top plate is the lighter part on the top of the box.
    expect(boundsOf(mesh, STAGE_COLORS.podiumTop).min[1]).toBeGreaterThan(0.2);
  });

  it('builds the podium and the steps at the podium of the layout', () => {
    const side = 9;
    const podium = [0, 0, side / 2 - 1.8] as const;
    const mesh = buildStage(side, podium);
    const box = boundsOf(mesh, STAGE_COLORS.podium);
    expect((box.min[2] + box.max[2]) / 2).toBeCloseTo(podium[2], 5);
    // The steps stay at the front edge, 0.4 m to the left of the podium center.
    const near = boundsOf(buildStage(side, frontPodium(side)), STAGE_COLORS.skirt);
    expect(boundsOf(mesh, STAGE_COLORS.skirt)).toEqual(near);
  });

  it('puts the desk of the conductor stand 0.80 m above the podium (design 4.5)', () => {
    const side = 6.6;
    const sheet = boundsOf(buildStage(side, frontPodium(side)), SCENE_COLORS.sheet);
    const middle = (sheet.min[1] + sheet.max[1]) / 2;
    expect(middle).toBeCloseTo(0.25 + 0.8, 2);
    expect(sheet.max[0] - sheet.min[0]).toBeLessThanOrEqual(0.6);
    // The score is in front of the podium center, toward the orchestra.
    expect(sheet.max[2]).toBeLessThan(side / 2 - 1.0);
  });

  it('builds no podium and no conductor stand for a chamber group (design 4.2)', () => {
    const side = 5;
    const mesh = buildStage(side, null);
    for (const color of [STAGE_COLORS.podium, STAGE_COLORS.podiumTop, SCENE_COLORS.sheet]) {
      expect(boundsOf(mesh, color).min[0]).toBe(Infinity);
    }
    // The steps stand 0.4 m to the left of the stage center, as with a podium at x = 0.
    const steps = boundsOf(buildStage(side, frontPodium(side)), STAGE_COLORS.skirt);
    expect(boundsOf(mesh, STAGE_COLORS.skirt)).toEqual(steps);
  });
});

describe('buildPodium', () => {
  it('builds the podium and the conductor stand of the stage at the origin', () => {
    const podium = boundsOf(buildPodium(), STAGE_COLORS.podium, STAGE_COLORS.podiumTop);
    expect(podium.min).toEqual([-0.45, 0, -0.45].map((v) => expect.closeTo(v, 5)));
    expect(podium.max).toEqual([0.45, 0.25, 0.45].map((v) => expect.closeTo(v, 5)));
    const sheet = boundsOf(buildPodium(), SCENE_COLORS.sheet);
    expect((sheet.min[1] + sheet.max[1]) / 2).toBeCloseTo(0.25 + 0.8, 2);
    expect(sheet.max[2]).toBeLessThan(0);
  });
});

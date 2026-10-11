import { describe, expect, it } from 'vitest';

import { SCENE_COLORS } from './colors.ts';
import type { MeshData, Rgb } from './mesh.ts';
import { triangleNormal } from './mesh.ts';
import { STAGE_COLORS } from './props.ts';
import { CONDUCTOR } from './cast.ts';
import { buildPlayer } from './player.ts';
import { boneIndex } from './rig.ts';
import {
  CONDUCTOR_STAND,
  PLANK_LENGTH,
  PLANK_LINE_WIDTH,
  PLANK_TONE,
  PLANK_WIDTH,
  PODIUM_SIZE,
  PODIUM_TRIM,
  STAGE_LIP,
  buildPodium,
  buildStage,
  keepsStageMargin,
  plankColor,
  plankHash,
  stageOutline,
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

/**
 * Finds the largest `|x - x0| + |z - z0|` of the vertices of the given colors: the reach toward
 * the corner cuts of an outline around (x0, z0).
 */
function diagonalReach(
  mesh: MeshData,
  center: readonly [number, number],
  ...colors: Rgb[]
): number {
  let reach = -Infinity;
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    if (colors.some((color) => sameColor(mesh, v, color))) {
      const x = (mesh.positions[v * 3] ?? 0) - center[0];
      const z = (mesh.positions[v * 3 + 2] ?? 0) - center[1];
      reach = Math.max(reach, Math.abs(x) + Math.abs(z));
    }
  }
  return reach;
}

/**
 * Gives the area of the planks inside the lip: the inner octagon of the stage outline.
 *
 * @param side The stage side.
 * @returns The area, in square meters.
 */
function plankArea(side: number): number {
  const [corner] = stageOutline(side, STAGE_LIP.width);
  const half = side / 2 - STAGE_LIP.width;
  const cut = half - Math.abs(corner?.[0] ?? 0);
  return 4 * half * half - 2 * cut * cut;
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
    it(`makes a slab of side ${side} and 0.40 thick, with cut corners (design 4.5)`, () => {
      const mesh = buildStage(side, frontPodium(side));
      const skirt = boundsOf(mesh, STAGE_COLORS.skirt, STAGE_COLORS.groove);
      expect(skirt.min[0]).toBeCloseTo(-side / 2, 5);
      expect(skirt.max[0]).toBeCloseTo(side / 2, 5);
      expect(skirt.min[2]).toBeCloseTo(-side / 2, 5);
      expect(skirt.max[2]).toBeCloseTo(side / 2, 5);
      expect(skirt.min[1]).toBeCloseTo(-0.4, 5);
      expect(skirt.max[1]).toBeCloseTo(-STAGE_LIP.drop, 5);
      // Each corner is cut by 0.1 of the side along each edge, as in orchestra-latest.png.
      const diagonal = 0.9 * side;
      expect(diagonalReach(mesh, [0, 0], STAGE_COLORS.skirt)).toBeCloseTo(diagonal, 5);
    });

    it(`raises a lip around the top of a stage of side ${side} (design 4.5)`, () => {
      const mesh = buildStage(side, frontPodium(side));
      const lip = boundsOf(mesh, STAGE_COLORS.nosing);
      expect(lip.min).toEqual(
        [-side / 2, -STAGE_LIP.drop, -side / 2].map((v) => expect.closeTo(v, 5)),
      );
      expect(lip.max).toEqual(
        [side / 2, STAGE_LIP.height, side / 2].map((v) => expect.closeTo(v, 5)),
      );
      const diagonal = 0.9 * side;
      expect(diagonalReach(mesh, [0, 0], STAGE_COLORS.nosing)).toBeCloseTo(diagonal, 5);
    });

    it(`covers the top of a stage of side ${side} inside the lip with planks and lines`, () => {
      const mesh = buildStage(side, frontPodium(side));
      expect(topArea(mesh, side)).toBeCloseTo(plankArea(side), 3);
      // The planks end at the corner cuts of the lip.
      const [corner] = stageOutline(side, STAGE_LIP.width);
      const reach = Math.abs(corner?.[0] ?? 0) + Math.abs(corner?.[1] ?? 0);
      const plankColors = [
        STAGE_COLORS.seam,
        ...Array.from({ length: 6 }, (_, i) => plankColor(0, i)),
      ];
      expect(diagonalReach(mesh, [0, 0], ...plankColors)).toBeLessThanOrEqual(reach + 1e-5);
    });
  }

  it('makes planks of 0.22 that run from the left to the right, with staggered joints', () => {
    const side = 8;
    const inner = side / 2 - STAGE_LIP.width;
    const mesh = buildStage(side, frontPodium(side));
    const top = topTriangles(mesh);
    const isSeam = (vertex: number): boolean => sameColor(mesh, vertex, STAGE_COLORS.seam);
    // The lines between two rows run over the full width, except at the corner cuts.
    const [corner] = stageOutline(side, STAGE_LIP.width);
    const straight = Math.abs(corner?.[0] ?? 0);
    const rows = Math.ceil((2 * inner) / PLANK_WIDTH);
    const fullRows = Array.from(
      { length: rows - 1 },
      (_, row) => -inner + (row + 1) * PLANK_WIDTH,
    ).filter((z) => Math.abs(z) + PLANK_LINE_WIDTH / 2 <= straight).length;
    const rowLines = top.filter((t) => isSeam(t.vertex) && t.maxX - t.minX > 2 * inner - 1e-6);
    expect(rowLines).toHaveLength(fullRows * 2);
    expect(fullRows).toBeGreaterThan(rows / 2);
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

  it('puts the podium box 1.0 m behind the front edge (design 4.5)', () => {
    const side = 6.6;
    const mesh = buildStage(side, frontPodium(side));
    const podium = boundsOf(mesh, STAGE_COLORS.podium, STAGE_COLORS.podiumTop);
    const [width, height] = PODIUM_SIZE;
    expect(podium.min).toEqual([
      expect.closeTo(-width / 2, 5),
      expect.closeTo(0, 5),
      expect.closeTo(side / 2 - 1.0 - width / 2, 5),
    ]);
    expect(podium.max).toEqual([
      expect.closeTo(width / 2, 5),
      expect.closeTo(height, 5),
      expect.closeTo(side / 2 - 1.0 + width / 2, 5),
    ]);
    // The top plate is the lighter part on the top of the box.
    expect(boundsOf(mesh, STAGE_COLORS.podiumTop).min[1]).toBeGreaterThan(height - 0.05);
  });

  it('builds the podium at the podium of the layout', () => {
    const side = 9;
    const podium = [0, 0, side / 2 - 1.8] as const;
    const box = boundsOf(buildStage(side, podium), STAGE_COLORS.podium);
    expect((box.min[2] + box.max[2]) / 2).toBeCloseTo(podium[2], 5);
  });

  it('builds nothing in front of the stage: no steps, as in mockup.png', () => {
    const side = 6.6;
    const mesh = buildStage(side, frontPodium(side));
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      expect(mesh.positions[v * 3 + 2]).toBeLessThanOrEqual(side / 2 + 1e-6);
    }
  });

  it('puts the top edge of the desk of the conductor stand at the shoulders of the bear (design 4.5)', () => {
    const side = 6.6;
    const sheet = boundsOf(buildStage(side, frontPodium(side)), SCENE_COLORS.sheet);
    const bear = buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument);
    const shoulder = PODIUM_SIZE[1] + (bear.skeleton.positions[boneIndex('upperArmR')]?.[1] ?? NaN);
    expect(Math.abs(sheet.max[1] - shoulder)).toBeLessThan(0.03);
    expect(sheet.max[0] - sheet.min[0]).toBeLessThanOrEqual(0.6);
    // The score is in front of the podium center, toward the orchestra.
    expect(sheet.max[2]).toBeLessThan(side / 2 - 1.0);
  });

  it('builds no podium and no conductor stand for a chamber group (design 4.2)', () => {
    const side = 5;
    const mesh = buildStage(side, null);
    for (const color of [
      STAGE_COLORS.podium,
      STAGE_COLORS.podiumPanel,
      STAGE_COLORS.podiumTop,
      STAGE_COLORS.podiumTopPanel,
      SCENE_COLORS.sheet,
    ]) {
      expect(boundsOf(mesh, color).min[0]).toBe(Infinity);
    }
  });
});

describe('keepsStageMargin', () => {
  it('keeps a margin from the four edges and from the four corner cuts', () => {
    const side = 10;
    // The cut line of the front right corner: x + z = 10 - 1 = 9.
    expect(keepsStageMargin(4.7, 0, side, 0.3)).toBe(true);
    expect(keepsStageMargin(4.71, 0, side, 0.3)).toBe(false);
    expect(keepsStageMargin(4.4, 4.17, side, 0.3)).toBe(true);
    expect(keepsStageMargin(4.4, 4.19, side, 0.3)).toBe(false);
    expect(keepsStageMargin(-4.4, -4.19, side, 0.3)).toBe(false);
  });
});

describe('buildPodium', () => {
  it('cuts the corners of the podium and frames its top and its sides (design 4.5)', () => {
    const mesh = buildPodium();
    const all = [
      STAGE_COLORS.podium,
      STAGE_COLORS.podiumPanel,
      STAGE_COLORS.podiumTop,
      STAGE_COLORS.podiumTopPanel,
    ];
    const [width, height] = PODIUM_SIZE;
    const half = width / 2;
    // The corners are cut by 0.1 m along each edge, as the podium of orchestra-latest.png.
    expect(diagonalReach(mesh, [0, 0], ...all)).toBeCloseTo(width - 0.1, 5);
    // The top: a frame of the plate color, a dark groove, and a panel inside them.
    const panel = boundsOf(mesh, STAGE_COLORS.podiumTopPanel);
    expect(panel.min[1]).toBeCloseTo(height, 6);
    expect(panel.max[0]).toBeCloseTo(half - PODIUM_TRIM.topFrame - PODIUM_TRIM.groove, 5);
    const groove = boundsOf(mesh, STAGE_COLORS.seam);
    expect(groove.min[1]).toBeCloseTo(height, 6);
    expect(groove.max[0]).toBeCloseTo(half - PODIUM_TRIM.topFrame, 5);
    // A darker panel on each of the four main sides, inside the top plate.
    const sides = boundsOf(mesh, STAGE_COLORS.podiumPanel);
    expect(sides.max[0]).toBeCloseTo(half - PODIUM_TRIM.overhang + PODIUM_TRIM.panelOut, 6);
    expect(sides.min[2]).toBeCloseTo(-sides.max[0], 6);
    expect(sides.max[1]).toBeLessThan(height - 0.04);
  });

  it('builds the podium and the conductor stand of the stage at the origin', () => {
    const podium = boundsOf(buildPodium(), STAGE_COLORS.podium, STAGE_COLORS.podiumTop);
    const [width, height] = PODIUM_SIZE;
    expect(podium.min).toEqual([-width / 2, 0, -width / 2].map((v) => expect.closeTo(v, 5)));
    expect(podium.max).toEqual([width / 2, height, width / 2].map((v) => expect.closeTo(v, 5)));
    const sheet = boundsOf(buildPodium(), SCENE_COLORS.sheet);
    expect((sheet.min[1] + sheet.max[1]) / 2).toBeCloseTo(height + CONDUCTOR_STAND.deskHeight, 2);
    expect(sheet.max[2]).toBeLessThan(0);
  });

  it('stands the conductor stand on the stage in front of the podium (design 4.5)', () => {
    // At 0.35 m on the podium, the belly of the bear went through the desk and the score.
    const stand = boundsOf(buildPodium(), SCENE_COLORS.stand);
    expect(stand.min[1]).toBeCloseTo(0, 6);
    expect(stand.max[2]).toBeLessThan(-PODIUM_SIZE[2] / 2);
    const sheet = boundsOf(buildPodium(), SCENE_COLORS.sheet);
    expect(sheet.max[2]).toBeLessThan(-PODIUM_SIZE[2] / 2);
  });
});

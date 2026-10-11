import { describe, expect, it } from 'vitest';

import { Vector3 } from 'three';
import type { Vec3 } from './tuples.ts';
import type { MeshData } from './mesh.ts';
import {
  CHAIR,
  HIGH_STOOL,
  STAGE_COLORS,
  STOOL,
  buildChair,
  buildMusicStand,
  buildRisers,
  buildSceneProps,
  buildStool,
  buildSupport,
  seatHeights,
} from './props.ts';
import { buildPianoBench } from './instruments/piano.ts';
import { SCENE_COLORS } from './colors.ts';
import type { PlayerPlace, SceneLayout } from './layout.ts';

function heights(mesh: MeshData): number[] {
  return [...mesh.positions].filter((_, i) => i % 3 === 1);
}

describe('buildChair', () => {
  it('stays within the budget of 120 triangles (design 4.5)', () => {
    expect(buildChair().positions.length / 9).toBeLessThanOrEqual(120);
  });

  it('has a seat at 0.35 and a back up to 0.85 (design 4.5)', () => {
    const ys = heights(buildChair());
    expect(Math.max(...ys)).toBeCloseTo(0.85, 6);
    expect(ys.filter((y) => Math.abs(y - 0.35) < 1e-6).length).toBeGreaterThan(0);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
  });

  it('puts a seat of another height at that height, and keeps the back above it', () => {
    const ys = heights(buildChair(0.3));

    expect(ys.filter((y) => Math.abs(y - 0.3) < 1e-6).length).toBeGreaterThan(0);
    expect(ys.some((y) => Math.abs(y - 0.35) < 1e-6)).toBe(false);
    expect(Math.max(...ys)).toBeCloseTo(0.3 + CHAIR.back, 6);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
  });

  it('has an open back below one wide top rail, as in animals.webp', () => {
    const mesh = buildChair();
    const inner = CHAIR.seatWidth / 2 - 0.035;
    // No part of the chair is in the opening between the posts, the seat, and the rail.
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      const x = mesh.positions[v * 3] ?? 0;
      const y = mesh.positions[v * 3 + 1] ?? 0;
      const inOpening = Math.abs(x) < inner - 1e-6 && y > CHAIR.seatHeight + 1e-6;
      if (inOpening) {
        expect(y).toBeGreaterThanOrEqual(CHAIR.seatHeight + CHAIR.back - CHAIR.rail - 1e-6);
      }
    }
  });
});

describe('buildMusicStand', () => {
  it('stays within the budget of 80 triangles (design 4.5)', () => {
    expect(buildMusicStand().positions.length / 9).toBeLessThanOrEqual(80);
  });

  it('holds the desk at a height of 1.05 (design 4.5)', () => {
    const ys = heights(buildMusicStand());
    // The desk of 0.35 leans back 30°, so it spans 0.35 × cos 30° in height around 1.05.
    expect(Math.max(...ys)).toBeCloseTo(1.05 + (0.35 / 2) * Math.cos(Math.PI / 6) + 0.003, 2);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-1e-6);
  });
});

/**
 * Gives the heights of the vertices of one color.
 *
 * @param mesh The mesh.
 * @param color The linear color.
 * @returns The heights.
 */
function heightsOf(mesh: MeshData, color: readonly number[]): number[] {
  const ys: number[] = [];
  for (let v = 0; v < mesh.positions.length / 3; v++) {
    if (color.every((c, i) => mesh.colors[v * 3 + i] === Math.fround(c))) {
      ys.push(mesh.positions[v * 3 + 1] ?? 0);
    }
  }
  return ys;
}

describe('the desk of a music stand (design 4.5, UX audit 2026-10-05, SC9)', () => {
  it('has a dark warm gray desk with a lighter edge, and a black post and legs', () => {
    // The black desks were the largest shapes of some close shots.
    const stand = buildMusicStand();
    const deskBottom = 1.05 - (0.35 / 2) * Math.cos(Math.PI / 6);
    expect(Math.min(...heightsOf(stand, SCENE_COLORS.standDesk))).toBeGreaterThan(
      deskBottom - 0.01,
    );
    expect(heightsOf(stand, SCENE_COLORS.standDesk).length).toBe(2 * 6);
    expect(heightsOf(stand, SCENE_COLORS.standEdge).length).toBe(4 * 6);
    // The black post ends at the middle of the desk, behind it.
    expect(Math.max(...heightsOf(stand, SCENE_COLORS.stand))).toBeLessThanOrEqual(1.05 + 1e-6);
  });
});

describe('buildStool', () => {
  it('builds the stool of the harp with no back, within 120 triangles (design 4.5)', () => {
    const stool = buildStool(false);
    expect(stool.positions.length / 9).toBeLessThanOrEqual(120);
    expect(Math.max(...heights(stool))).toBeCloseTo(STOOL.seatHeight, 6);
    expect(Math.min(...heights(stool))).toBeCloseTo(0, 6);
  });

  it('builds the high stool with a foot ring at 0.25, within 120 triangles (design 4.5)', () => {
    const stool = buildStool(true);
    expect(stool.positions.length / 9).toBeLessThanOrEqual(120);
    const ys = heights(stool);
    expect(Math.max(...ys)).toBeCloseTo(HIGH_STOOL.seatHeight, 6);
    expect(ys.some((y) => Math.abs(y - HIGH_STOOL.footRing) < 1e-6)).toBe(true);
    const xs = [...stool.positions].filter((_, i) => i % 3 === 0);
    expect(Math.max(...xs)).toBeCloseTo(HIGH_STOOL.seatSize / 2, 6);
  });

  it('puts the seat and the foot ring of a high stool at the heights that it gets', () => {
    const ys = heights(buildStool(true, { seatHeight: 0.66, footHeight: 0.3 }));

    expect(Math.max(...ys)).toBeCloseTo(0.66, 6);
    expect(ys.some((y) => Math.abs(y - 0.3) < 1e-6)).toBe(true);
    expect(ys.some((y) => Math.abs(y - HIGH_STOOL.footRing) < 1e-6)).toBe(false);
  });
});

describe('buildSupport', () => {
  it('builds each seat at the heights that it gets', () => {
    const seat = { seatHeight: 0.3, footHeight: 0 };

    expect(buildSupport('chair', seat)).toEqual(buildChair(0.3));
    expect(buildSupport('stool', seat)).toEqual(buildStool(false, seat));
    expect(buildSupport('high-stool', { seatHeight: 0.7, footHeight: 0.3 })).toEqual(
      buildStool(true, { seatHeight: 0.7, footHeight: 0.3 }),
    );
    expect(buildSupport('bench', seat)).toEqual(buildPianoBench(0.3));
    expect(buildSupport('stand', null)).toBeNull();
  });

  it('builds the seat of each support at its heights, and nothing under a standing player', () => {
    expect(buildSupport('chair', seatHeights('chair'))).toEqual(buildChair());
    expect(buildSupport('stool', seatHeights('stool'))).toEqual(buildStool(false));
    expect(buildSupport('high-stool', seatHeights('high-stool'))).toEqual(buildStool(true));
    expect(buildSupport('bench', seatHeights('bench'))).toEqual(buildPianoBench());
    expect(seatHeights('stand')).toBeNull();
    expect(seatHeights('riser')).toBeNull();
    expect(buildSupport('riser', null)).toBeNull();
  });
});

describe('buildRisers', () => {
  const podium = [0, 0, 1] as const;
  const level = { level: 0, radius: 3, height: 0.25, halfAngle: 0.5 };
  const mesh = buildRisers([level], podium);

  it('builds an arc block 0.8 m deep and three steps of 0.2 m in front of it (design 4.5)', () => {
    const p = mesh.positions;
    for (let v = 0; v < p.length / 3; v++) {
      const dx = (p[v * 3] ?? 0) - podium[0];
      const dz = (p[v * 3 + 2] ?? 0) - podium[2];
      expect(Math.hypot(dx, dz)).toBeGreaterThan(3 - 0.4 - 0.6 - 1e-6);
      expect(Math.hypot(dx, dz)).toBeLessThan(3 + 0.4 + 1e-6);
      expect(Math.abs(Math.atan2(dx, -dz))).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(p[v * 3 + 1]).toBeGreaterThanOrEqual(0);
      expect(p[v * 3 + 1]).toBeLessThanOrEqual(0.25 + 1e-6);
    }
  });

  it('closes the blocks with faces that point out', () => {
    // The stage top closes the blocks, so the volume from the origin on the stage top is exact.
    let volume = 0;
    const p = mesh.positions;
    for (let t = 0; t < p.length / 9; t++) {
      const at = (k: number): Vector3 =>
        new Vector3(p[t * 9 + k * 3] ?? 0, p[t * 9 + k * 3 + 1] ?? 0, p[t * 9 + k * 3 + 2] ?? 0);
      volume += at(0).dot(new Vector3().crossVectors(at(1), at(2))) / 6;
    }
    // The arc is 1 radian wide. The level is 0.8 m deep and 0.25 m high (0.6 m3), and the steps
    // are 0.2 m deep and 0.1875, 0.125, and 0.0625 m high (0.1775 m3). The flat faces cut a
    // little of them.
    expect(volume).toBeGreaterThan(0.7775 * 0.99);
    expect(volume).toBeLessThanOrEqual(0.7775 + 1e-9);
  });

  it('steps up from the stage top in even rises to the levels (design 4.5)', () => {
    const levels = [
      { level: 0, radius: 3, height: 1, halfAngle: 0.5 },
      { level: 1, radius: 3.8, height: 1.25, halfAngle: 0.5 },
    ];
    const risers = buildRisers(levels, podium);
    const tops = new Set<number>();
    const nosings = new Set<number>();
    const lines = new Set<number>();
    for (let v = 0; v < risers.positions.length / 3; v++) {
      const y = Math.round((risers.positions[v * 3 + 1] ?? 0) * 1000) / 1000;
      const color = [0, 1, 2].map((k) => risers.colors[v * 3 + k]);
      const is = (rgb: readonly number[]): boolean =>
        rgb.every((c, k) => color[k] === Math.fround(c));
      if (is(STAGE_COLORS.riserTread)) {
        tops.add(y);
      }
      if (is(STAGE_COLORS.riserNosing)) {
        nosings.add(y);
      }
      if (is(STAGE_COLORS.seam)) {
        lines.add(y);
      }
    }
    // Three steps divide the 1.0 m of the lowest level into rises of 0.25 m, as the higher levels.
    expect([...tops].toSorted((a, b) => a - b)).toEqual([0.25, 0.5, 0.75, 1, 1.25]);
    // Each tread has a lighter front edge. A level of 0.8 m has two boards with a dark line
    // between them, and a step of 0.2 m has one board.
    expect([...nosings].toSorted((a, b) => a - b)).toEqual([0.25, 0.5, 0.75, 1, 1.25]);
    expect([...lines].toSorted((a, b) => a - b)).toEqual([1, 1.25]);
  });
});

describe('buildSceneProps', () => {
  /** Makes the place of a player for a test layout. */
  function player(
    position: Vec3,
    facing: number,
    support: PlayerPlace['cast']['support'],
  ): PlayerPlace {
    return {
      position,
      facing,
      cast: {
        seatIndex: 0,
        player: 0,
        species: 'rabbit',
        instrument: 'violin',
        kettles: 4,
        support,
      },
    };
  }

  const layout: SceneLayout = {
    stageSide: 8,
    podium: [0, 0, 3],
    conductor: { position: [0, 0.25, 3], facing: 0 },
    players: [
      player([1, 0, 2], Math.PI / 2, 'chair'),
      player([0, 0.25, -2], 0, 'riser'),
      player([-1, 0, 0], 0, 'high-stool'),
    ],
    stands: [{ position: [-1, 0, -1], facing: 0 }],
    risers: [{ level: 0, radius: 5, height: 0.25, halfAngle: 0.3 }],
  };

  it('merges the seats, the stands, and the risers into one mesh (design 4.4)', () => {
    const mesh = buildSceneProps(layout);
    const parts = [
      buildChair(),
      buildStool(true),
      buildMusicStand(),
      buildRisers(layout.risers, layout.podium),
    ];
    const triangles = parts.reduce((sum, part) => sum + part.positions.length / 9, 0);
    expect(mesh.positions.length / 9).toBe(triangles);
  });

  it('puts each seat at the place and the facing of its player', () => {
    const mesh = buildSceneProps({ ...layout, players: layout.players.slice(0, 1), stands: [] });
    const points = Array.from({ length: mesh.positions.length / 3 }, (_, v): Vec3 => [
      mesh.positions[v * 3] ?? 0,
      mesh.positions[v * 3 + 1] ?? 0,
      mesh.positions[v * 3 + 2] ?? 0,
    ]).filter((p) => Math.hypot(p[0] - 1, p[2] - 2) < 0.5);
    // A facing of 90° turns the chair back from +z to +x.
    const top = points.filter((p) => Math.abs(p[1] - CHAIR.seatHeight - CHAIR.back) < 1e-6);
    expect(top.length).toBeGreaterThan(0);
    for (const p of top) {
      expect(p[0]).toBeGreaterThan(1.1);
    }
  });
});

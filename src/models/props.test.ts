import { describe, expect, it } from 'vitest';

import { cross, dot } from './math.ts';
import type { Vec3 } from './math.ts';
import type { MeshData } from './mesh.ts';
import {
  HIGH_STOOL,
  STOOL,
  buildChair,
  buildMusicStand,
  buildRisers,
  buildSceneProps,
  buildStool,
  buildSupport,
} from './props.ts';
import { buildPianoBench } from './instruments/piano.ts';
import type { PlayerPlace, SceneLayout } from './layout.ts';

function heights(mesh: MeshData): number[] {
  return [...mesh.positions].filter((_, i) => i % 3 === 1);
}

describe('buildChair', () => {
  it('stays within the budget of 120 triangles (design 4.5)', () => {
    expect(buildChair().positions.length / 9).toBeLessThanOrEqual(120);
  });

  it('has a seat at 0.45 and a back up to 0.95 (design 4.5)', () => {
    const ys = heights(buildChair());
    expect(Math.max(...ys)).toBeCloseTo(0.95, 6);
    expect(ys.filter((y) => Math.abs(y - 0.45) < 1e-6).length).toBeGreaterThan(0);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
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
});

describe('buildSupport', () => {
  it('builds the seat of each support, and nothing under a standing player', () => {
    expect(buildSupport('chair')).toEqual(buildChair());
    expect(buildSupport('stool')).toEqual(buildStool(false));
    expect(buildSupport('high-stool')).toEqual(buildStool(true));
    expect(buildSupport('bench')).toEqual(buildPianoBench());
    expect(buildSupport('stand')).toBeNull();
    expect(buildSupport('riser')).toBeNull();
  });
});

describe('buildRisers', () => {
  const podium = [0, 0, 1] as const;
  const level = { level: 0, radius: 3, height: 0.25, halfAngle: 0.5 };
  const mesh = buildRisers([level], podium);

  it('builds an arc block 0.8 m deep around the podium (design 4.5)', () => {
    const p = mesh.positions;
    for (let v = 0; v < p.length / 3; v++) {
      const dx = (p[v * 3] ?? 0) - podium[0];
      const dz = (p[v * 3 + 2] ?? 0) - podium[2];
      expect(Math.hypot(dx, dz)).toBeGreaterThan(3 - 0.4 - 1e-6);
      expect(Math.hypot(dx, dz)).toBeLessThan(3 + 0.4 + 1e-6);
      expect(Math.abs(Math.atan2(dx, -dz))).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(p[v * 3 + 1]).toBeGreaterThanOrEqual(0);
      expect(p[v * 3 + 1]).toBeLessThanOrEqual(0.25 + 1e-6);
    }
  });

  it('closes the block with faces that point out', () => {
    // The stage top closes the block, so the volume from the origin on the stage top is exact.
    let volume = 0;
    const p = mesh.positions;
    for (let t = 0; t < p.length / 9; t++) {
      const at = (k: number): Vec3 => [
        p[t * 9 + k * 3] ?? 0,
        p[t * 9 + k * 3 + 1] ?? 0,
        p[t * 9 + k * 3 + 2] ?? 0,
      ];
      volume += dot(at(0), cross(at(1), at(2))) / 6;
    }
    // The arc is 1 radian wide, 0.8 m deep, and 0.25 m high. The flat faces cut a little of it.
    expect(volume).toBeGreaterThan(0.6 * 0.99);
    expect(volume).toBeLessThanOrEqual(0.6);
  });
});

describe('buildSceneProps', () => {
  /** Makes the place of a player for a test layout. */
  function player(position: Vec3, facing: number, support: PlayerPlace['support']): PlayerPlace {
    return {
      position,
      facing,
      support,
      cast: { seatIndex: 0, player: 0, species: 'rabbit', instrument: 'violin', kettles: 4 },
    };
  }

  const layout: SceneLayout = {
    stageSide: 8,
    podium: [0, 0, 3],
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
    const top = points.filter((p) => Math.abs(p[1] - 0.95) < 1e-6);
    expect(top.length).toBeGreaterThan(0);
    for (const p of top) {
      expect(p[0]).toBeGreaterThan(1.1);
    }
  });
});

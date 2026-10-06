import { describe, expect, it } from 'vitest';

import type { Vec3 } from '../models/tuples.ts';
import { HALL, buildHall, hallCutaway, hallLight, hallUnit } from './hall.ts';

/** Gives the corners and the normal of each triangle of a hall mesh. */
function triangles(positions: Float32Array): { center: Vec3; normal: Vec3 }[] {
  const list = [];
  for (let t = 0; t < positions.length / 9; t++) {
    const p = (k: number): Vec3 => [
      positions[t * 9 + k * 3] ?? 0,
      positions[t * 9 + k * 3 + 1] ?? 0,
      positions[t * 9 + k * 3 + 2] ?? 0,
    ];
    const [a, b, c] = [p(0), p(1), p(2)];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal: Vec3 = [
      (u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
      (u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
      (u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0),
    ];
    const center: Vec3 = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    list.push({ center, normal });
  }
  return list;
}

describe('buildHall (design 4.5, hall)', () => {
  const side = 11.19;
  const unit = hallUnit(side);
  const hall = buildHall(side);
  const centerZ = HALL.centerZ * unit;

  it('turns each vertical face of the shell to the ring center', () => {
    for (const { center, normal } of triangles(hall.shell.positions)) {
      const horizontal = Math.hypot(normal[0], normal[2]);
      if (horizontal < 1e-9) {
        continue;
      }
      const toCenter = [-center[0], centerZ - center[2]];
      expect(normal[0] * (toCenter[0] ?? 0) + normal[2] * (toCenter[1] ?? 0)).toBeGreaterThan(0);
    }
  });

  it('keeps the hall away from the stage corners', () => {
    const corner = (side / 2) * Math.SQRT2;
    for (let v = 0; v < hall.shell.positions.length / 3; v++) {
      const x = hall.shell.positions[v * 3] ?? 0;
      const z = hall.shell.positions[v * 3 + 2] ?? 0;
      expect(Math.hypot(x, z)).toBeGreaterThan(corner + 2);
    }
  });

  it('puts the lamps on the rails of the two tiers, about one lamp spacing apart', () => {
    const heights = new Set(hall.lampCenters.map((c) => Math.round(c[1] * 100)));
    expect(heights.size).toBe(HALL.tiers.length);
    const lower = hall.lampCenters.filter(
      (c) => Math.abs(c[1] - (hall.lampCenters[0]?.[1] ?? 0)) < 0.01,
    );
    const radius = Math.hypot(lower[0]?.[0] ?? 0, (lower[0]?.[2] ?? 0) - centerZ);
    expect((2 * Math.PI * radius) / lower.length).toBeCloseTo(HALL.lampSpacing, 0);
  });

  it('gives the lamps a light above 1, so that the bloom takes them', () => {
    expect(Math.min(...hall.lamps.colors)).toBeGreaterThan(1);
  });

  it('keeps the shell dark: no baked color above 0.2', () => {
    expect(Math.max(...hall.shell.colors)).toBeLessThan(0.2);
  });
});

describe('hallLight', () => {
  const unit = 11.19;
  const facing: Vec3 = [0, 0, 1];

  it('is brighter near the stage, and darker high on the walls', () => {
    expect(hallLight([0, 0, -8], facing, unit)).toBeGreaterThan(
      hallLight([0, 0, -16], facing, unit),
    );
    expect(hallLight([0, 0, -16], facing, unit)).toBeGreaterThan(
      hallLight([0, 14, -16], facing, unit),
    );
  });

  it('gives a face that turns away from the stage less light', () => {
    expect(hallLight([0, 0, -16], [0, 0, -1], unit)).toBeLessThan(
      hallLight([0, 0, -16], facing, unit),
    );
  });
});

describe('hallCutaway (design 4.5, hall)', () => {
  const side = 11.19;
  const unit = hallUnit(side);
  const radius = HALL.wallRadius * unit;
  const centerZ = HALL.centerZ * unit;

  it('cuts nothing for a camera inside the ring, as in a close shot', () => {
    expect(hallCutaway(side, [0, 2, centerZ + 0.5 * radius]).limit).toBe(2);
  });

  it('cuts the side of the camera for a camera outside the ring', () => {
    const cut = hallCutaway(side, [0, 18, centerZ + 2 * radius]);
    expect(cut.limit).toBeCloseTo(Math.cos(HALL.cutawayAngle), 12);
    expect(cut.direction[0]).toBeCloseTo(0, 12);
    expect(cut.direction[1]).toBeCloseTo(1, 12);
  });

  it('opens the cut step by step near the wall, so a move of the camera has no jump', () => {
    const limits = [0.8, 0.88, 0.92, 0.96, 1.01].map(
      (share) => hallCutaway(side, [share * radius, 2, centerZ]).limit,
    );
    expect(limits).toEqual(limits.toSorted((a, b) => b - a));
    expect(limits[0]).toBe(2);
    expect(limits.at(-1)).toBeCloseTo(Math.cos(HALL.cutawayAngle), 12);
  });
});

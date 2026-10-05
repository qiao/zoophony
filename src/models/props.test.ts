import { describe, expect, it } from 'vitest';

import type { MeshData } from './mesh.ts';
import { buildChair, buildMusicStand } from './props.ts';

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

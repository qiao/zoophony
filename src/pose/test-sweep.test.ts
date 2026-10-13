import { describe, expect, it } from 'vitest';

import { buildPlayer } from '../models/player.ts';
import type { Vec3 } from '../models/tuples.ts';
import { BIND_ROTATIONS } from './frames.ts';
import { HEAD_BONES, boxTriangles, closeSurface, posedPart } from './test-clearance.ts';
import type { ClosedSurface } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import { PLAYING } from './test-scene.ts';
import { HEAD_PART, gapPairs, gapSweep, gapText } from './test-sweep.ts';
import type { SweepObstacle } from './test-sweep.ts';

describe('gapPairs', () => {
  it('pairs the head with each obstacle but the body, and each paw with the body', () => {
    const surface = (): ClosedSurface => closeSurface(boxTriangles([0, 0, 0], [1, 1, 1]), 0);
    const role = {
      obstacles: ['body', 'case', 'lid'].map((name): SweepObstacle => ({ name, surface })),
    };
    const pairs = gapPairs(role).map(({ part, into }) => `${part.name} ${into}`);
    expect(pairs).toEqual(['head case', 'head lid', 'paw L body', 'paw R body']);
  });
});

describe('gapSweep', () => {
  it('keeps the smallest gap of the head to a box over the samples, with its time and bone', () => {
    const model = buildPlayer('rabbit', 'violin');
    const posed = poseSkeleton(model, {
      rotations: Float32Array.from(BIND_ROTATIONS),
      rootOffset: [0, 0, 0],
      slideOffset: [0, 0, 0],
      blink: 0,
    });
    const { min, max } = posedPart(posed, HEAD_BONES).box;

    // A lid over the whole head, at a height over the top of the head.
    const lid = (over: number): ReadonlyMap<string, ClosedSurface> => {
      const low: Vec3 = [min.x - 0.1, max.y + over, min.z - 0.1];
      const high: Vec3 = [max.x + 0.1, max.y + over + 0.1, max.z + 0.1];
      return new Map([['lid', closeSurface(boxTriangles(low, high), 0)]]);
    };
    const sweep = gapSweep([{ part: HEAD_PART, into: 'lid' }]);
    sweep.visit(posed, [1, 11, PLAYING], lid(0.05));
    sweep.visit(posed, [2, 12, PLAYING], lid(0.02));
    sweep.visit(posed, [3, 13, PLAYING], lid(0.1));

    const [gap] = sweep.gaps();
    expect(gap?.gap).toBeCloseTo(0.02, 9);
    expect([gap?.song, gap?.wall]).toEqual([2, 12]);
    expect(HEAD_BONES).toContain(gap?.bone);
    expect(gap && gapText(gap)).toMatch(/^head to lid: 2\.0 cm at song 2\.00 s, wall 12\.00 s/);

    // A lid that cuts the head touches it.
    sweep.visit(posed, [4, 14, PLAYING], lid(-0.03));
    expect(sweep.gaps()[0]?.gap).toBe(0);
  });

  it('gives no gap for a pair with no sample', () => {
    const [gap] = gapSweep([{ part: HEAD_PART, into: 'lid' }]).gaps();
    expect(gap && gapText(gap)).toBe('head to lid: no sample');
  });
});

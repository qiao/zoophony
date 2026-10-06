import { describe, expect, it } from 'vitest';

import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { PLAYING } from '../pose/test-scene.ts';
import { scoreOf } from '../score/test-score.ts';
import { cameraAt, createCameraPose } from './camera-at.ts';
import { prepareShots } from './prepare.ts';
import { TEST_SEED, shotDemos } from './test-shots.ts';

const DEMOS = await shotDemos();

/**
 * The most time of the work of the shots, as a multiple of the time of {@link referenceWork}. The
 * ratios on the development Mac are in the comment of each limit, and each limit is 2 times its
 * ratio. Thus a change that is 3 times slower fails, and a loaded or a slower machine passes,
 * because its reference work is slower too.
 */
const LIMITS = {
  /**
   * 2.9 on the development Mac for the Boulanger demo, the slowest demo (8 ms). Thus the limit is
   * about 16 ms on that Mac, below the 20 ms of design 9.7.
   */
  prepare: 5.8,
  /**
   * 0.000054 for one call on the development Mac (0.15 µs). Thus the limit is about 0.3 µs on
   * that Mac, far below the 0.01 ms of design 9.7.
   */
  camera: 0.00011,
} as const;

/** The rounds of a measurement. */
const ROUNDS = 15;

/** The calls of `cameraAt()` in one round. */
const CALLS = 2000;

/**
 * Does a fixed amount of float math on new small arrays, as `pose/pose-speed.test.ts` does. It
 * takes about 2.6 ms on the development Mac.
 *
 * @returns A sum, so that the work has a result.
 */
function referenceWork(): number {
  let sum = 0;
  for (let i = 0; i < 100_000; i++) {
    const v: [number, number, number] = [Math.sin(i), Math.cos(i), i * 1e-4];
    sum += Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }
  return sum;
}

/**
 * Measures a work as a multiple of the time of {@link referenceWork}. The rounds time the work
 * and the reference work in turn, and keep the least time of each, because load only adds time.
 *
 * @param work The work. It returns a number, so that it has a result.
 * @param rounds The number of rounds.
 * @returns The least time of the work, divided by the least time of the reference work.
 */
function ratioOf(work: () => number, rounds: number): number {
  let least = Infinity;
  let reference = Infinity;
  let sum = 0;
  for (let round = 0; round < rounds; round++) {
    let start = performance.now();
    sum += referenceWork();
    reference = Math.min(reference, performance.now() - start);
    start = performance.now();
    sum += work();
    least = Math.min(least, performance.now() - start);
  }
  expect(sum).not.toBeNaN();
  return least / reference;
}

describe('the time of the shots (design 9.7)', () => {
  const scenes = DEMOS.map((demo) => {
    const score = scoreOf(demo.bytes);
    const models = new ModelCache();
    const layout = layoutScene(score, models);
    return { file: demo.file, score, layout, models };
  });

  it('prepares the shots of each demo in at most 2 times the time on the development Mac', () => {
    let slowest = 0;
    for (const scene of scenes) {
      const ratio = ratioOf(
        () => prepareShots(scene.score, scene.layout, TEST_SEED, scene.models).shots.length,
        ROUNDS,
      );
      slowest = Math.max(slowest, ratio);
    }
    expect(slowest).toBeLessThan(LIMITS.prepare);
  });

  it('calculates one camera in at most 2 times the time on the development Mac', () => {
    const scene = scenes[0];
    if (!scene) {
      throw new Error('No scene.');
    }
    const plan = prepareShots(scene.score, scene.layout, TEST_SEED, scene.models);
    const out = createCameraPose();
    const view = { aspect: 1.6, still: false };
    const duration = scene.score.durationSec;
    const ratio = ratioOf(() => {
      let sum = 0;
      for (let i = 0; i < CALLS; i++) {
        sum += cameraAt(plan, (i / CALLS) * duration, PLAYING, view, out).position[0];
      }
      return sum;
    }, ROUNDS);
    expect(ratio / CALLS).toBeLessThan(LIMITS.camera);
  });
});

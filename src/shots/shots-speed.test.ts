import { describe, expect, it } from 'vitest';

import { layoutScene } from '../models/layout-scene.ts';
import { ModelCache } from '../models/model-cache.ts';
import { PLAYING } from '../pose/test-scene.ts';
import { scoreOf } from '../score/test-score.ts';
import { cameraAt, createCameraPose } from './camera-at.ts';
import { prepareShots } from './prepare.ts';
import { timeRatio } from '../test-speed.ts';
import { TEST_SEED, shotDemos } from './test-shots.ts';

const DEMOS = await shotDemos();

/**
 * The most time of the work of the shots, as a multiple of the time of the reference work of
 * {@link timeRatio}. The
 * ratios on the development Mac are in the comment of each limit, and each limit is 2 times its
 * ratio. Thus a change that is 3 times slower fails, and a loaded or a slower machine passes,
 * because its reference work is slower too.
 */
const LIMITS = {
  /**
   * 5.5 on the development Mac for the Boulanger demo, the slowest demo (14.4 ms). The limit is about 29 ms on that Mac, above the 20 ms of design 9.7. Thus
   * the test finds a plan that is 2 times slower, and the target of 9.7 needs a measure on that
   * Mac.
   */
  prepare: 11,
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
      const ratio = timeRatio(() => {
        prepareShots(scene.score, scene.layout, TEST_SEED, scene.models);
      }, ROUNDS);
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
    const ratio = timeRatio(() => {
      for (let i = 0; i < CALLS; i++) {
        cameraAt(plan, (i / CALLS) * duration, PLAYING, view, out);
      }
    }, ROUNDS);
    expect(ratio / CALLS).toBeLessThan(LIMITS.camera);
  });
});

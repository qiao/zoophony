import { describe, expect, it } from 'vitest';

import { chord, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { perf60File } from '../models/test-perf-60.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';

/**
 * The most time of the poses of one frame, as a multiple of the time of {@link referenceWork}.
 * On the development Mac, the ratios are 0.044 (perf-60.mid) and 0.046 (60 violins), and each
 * limit is 2 times the ratio. Thus a pose that is 3 times slower fails, and the limits stay below
 * the 1 ms of design 9.7 on that Mac. A slower machine passes, because its reference work is
 * slower too. The ratios were 0.14 and 0.177 before the math of three.js replaced the tuple math.
 */
const LIMITS = { perf60: 0.088, violins: 0.092 } as const;

/** The rounds of a measurement. Each round times one batch of poses and one reference work. */
const ROUNDS = 60;

/** The song times of the poses of one round: one frame in each second of the test files. */
const SONG_TIMES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5] as const;

/** Ten violin seats of six players: 60 bowed string players, the slowest family of step 5. */
const SIXTY_VIOLINS: TestFile = {
  tracks: [
    [tempo(0, 120)],
    ...Array.from({ length: 10 }, (_, i) => {
      const channel = i < 9 ? i : i + 1;
      return track(
        [programChange(0, channel, 40)],
        ...[...Array(16).keys()].map((beat) =>
          chord(
            beat * 480,
            channel,
            [60, 62, 64, 65, 67, 69].map((k) => k + (beat % 5)),
            beat * 480 + 400,
          ),
        ),
      );
    }),
  ],
};

/**
 * Does a fixed amount of float math on new small arrays, as the pose code does. It takes about
 * 2.6 ms on the development Mac, near the time of one batch of poses.
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
 * Measures the time of `poseAt()` for one frame, as a multiple of the time of
 * {@link referenceWork}. The rounds time a batch of poses and the reference work in turn. Load on
 * the machine only adds time, and a short batch often runs with no stop. Thus the least time of
 * each over all rounds is near its time with no load.
 *
 * @param scene The scene.
 * @returns The least time of one pose, divided by the least time of the reference work.
 */
function frameRatio(scene: TestScene): number {
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  let pose = Infinity;
  let reference = Infinity;
  let sum = 0;
  for (let round = 0; round < ROUNDS; round++) {
    let start = performance.now();
    sum += referenceWork();
    reference = Math.min(reference, performance.now() - start);
    start = performance.now();
    for (const time of SONG_TIMES) {
      poseAt(scene.plan, time, 100 + time, PLAYING, audible, buffer);
    }
    pose = Math.min(pose, (performance.now() - start) / SONG_TIMES.length);
  }
  expect(sum).toBeGreaterThan(0);
  return pose / reference;
}

describe('the time of poseAt() (design 9.7)', () => {
  it('poses the 60 players of perf-60.mid in at most 2 times the time on the development Mac', () => {
    const scene = sceneOf(perf60File(), 1, 'one-per-part');
    expect(scene.plan.players).toHaveLength(60);
    expect(frameRatio(scene)).toBeLessThan(LIMITS.perf60);
  });

  it('poses 60 bowed string players in at most 2 times the time on the development Mac', () => {
    const scene = sceneOf(SIXTY_VIOLINS, 1, 'one-per-part');
    expect(scene.plan.players).toHaveLength(60);
    expect(scene.plan.players.every((p) => p.note.family === 'bowed')).toBe(true);
    expect(frameRatio(scene)).toBeLessThan(LIMITS.violins);
  });
});

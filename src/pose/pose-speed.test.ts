import { describe, expect, it } from 'vitest';

import { chord, programChange, tempo, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { perf60File } from '../models/test-perf-60.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { PLAYING, allAudible, sceneOf } from './test-scene.ts';
import type { TestScene } from './test-scene.ts';

/**
 * The most main thread time for the poses of one frame. The frame target of design 9.7 gives the
 * main thread 4 ms for 60 players, and the scene needs most of it.
 */
const FRAME_BUDGET_MS = 1;

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
 * Measures the mean time of `poseAt()` for one frame, over 2000 frames of 1/60 s after a warm
 * up.
 *
 * @returns The mean time, in milliseconds.
 */
function meanFrameMs(scene: TestScene): number {
  const audible = allAudible(scene.score);
  const buffer = createScenePose(scene.plan);
  const frame = (i: number): void => {
    poseAt(scene.plan, (i / 60) % 8, 100 + i / 60, PLAYING, audible, buffer);
  };
  for (let i = 0; i < 300; i++) {
    frame(i);
  }
  const frames = 2000;
  const start = performance.now();
  for (let i = 0; i < frames; i++) {
    frame(i);
  }
  return (performance.now() - start) / frames;
}

describe('the time of poseAt() (design 9.7)', () => {
  it('poses the 60 players of perf-60.mid in much less than the frame budget', () => {
    const scene = sceneOf(perf60File(), 1, 'one-per-part');
    expect(scene.plan.players).toHaveLength(60);
    expect(meanFrameMs(scene)).toBeLessThan(FRAME_BUDGET_MS);
  });

  it('poses 60 bowed string players in much less than the frame budget', () => {
    const scene = sceneOf(SIXTY_VIOLINS, 1, 'one-per-part');
    expect(scene.plan.players).toHaveLength(60);
    expect(scene.plan.players.every((p) => p.note.family === 'bowed')).toBe(true);
    expect(meanFrameMs(scene)).toBeLessThan(FRAME_BUDGET_MS);
  });
});

import { describe, expect, it } from 'vitest';

import { armTurnAfterDownbeat, smokeFailures } from './smoke.ts';
import type { SmokeRun, SmokeSample } from './smoke.ts';

/** The quaternion of a turn about x by an angle, as (x, y, z, w). */
function turnX(angle: number): number[] {
  return [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
}

/** The count-in of the Boulanger demo, the default demo (design 5.4). */
const COUNT_IN = 1.617;

/**
 * Makes the samples of 4 s of play after a count-in, with the upper arm turned by `armAt(t)` at
 * each song time.
 */
function samples(armAt: (song: number) => number, songRate = 1): SmokeSample[] {
  return Array.from({ length: 40 }, (_, i) => {
    const t = (i + 1) / 10;
    const songTime = (t - COUNT_IN) * songRate;
    return { elapsedSec: t, songTime, arm: [...turnX(armAt(songTime)), ...turnX(0)] };
  });
}

/** A run that passes all checks: the bow arm moves after the downbeat. */
const PASS: SmokeRun = {
  songTimeBefore: 0,
  samples: samples((song) => (song < 0 ? 0 : 0.2 * Math.sin(4 * song))),
  canvasDrawn: true,
  errors: [],
};

describe('smokeFailures (design 9.3)', () => {
  it('passes a run in which the song time and the bow arm move after the count-in', () => {
    expect(smokeFailures(PASS)).toEqual([]);
  });

  it('fails a song time that does not increase', () => {
    expect(smokeFailures({ ...PASS, samples: samples((t) => Math.sin(4 * t), 0.5) })).toEqual([
      'The song time increased by 1.950 s in 3.900 s.',
      'The song time reached 1.192 s only.',
    ]);
  });

  it('fails a play with no count-in', () => {
    const started = PASS.samples.map((s) => ({ ...s, songTime: s.elapsedSec }));
    expect(smokeFailures({ ...PASS, samples: started })).toEqual([
      'The song time did not read below 0 in the count-in.',
    ]);
  });

  it('fails a bow arm that moves only in the count-in', () => {
    const lift = samples((song) => (song < 0 ? song : 0));
    expect(smokeFailures({ ...PASS, samples: lift })).toEqual([
      'The bow arm of the first violin turned by 0.000 rad only.',
    ]);
  });

  it('fails an empty canvas and each console error', () => {
    expect(smokeFailures({ ...PASS, canvasDrawn: false, errors: ['x'] })).toEqual([
      'The canvas is empty.',
      'Console error: x',
    ]);
  });
});

describe('armTurnAfterDownbeat', () => {
  it('measures the largest turn from the first sample at the song time 0 or later', () => {
    const run = samples((song) => (song >= 0 ? song : 1));
    expect(armTurnAfterDownbeat(run)).toBeCloseTo(4 - 1.7, 6);
  });
});

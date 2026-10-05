import { describe, expect, it } from 'vitest';

import { SMOKE, armTurnAfterLift, smokeFailures } from './smoke.ts';
import type { SmokeRun, SmokeSample } from './smoke.ts';

/** The quaternion of a turn about x by an angle, as (x, y, z, w). */
function turnX(angle: number): number[] {
  return [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
}

/** Makes the samples of 3 s of play, with the upper arm turned by `armAt(t)` at each time. */
function samples(armAt: (t: number) => number, songRate = 1): SmokeSample[] {
  return Array.from({ length: 30 }, (_, i) => {
    const t = (i + 1) / 10;
    return { elapsedSec: t, songTime: t * songRate, arm: [...turnX(armAt(t)), ...turnX(0)] };
  });
}

/** A run that passes all checks: the bow arm moves after the lift. */
const PASS: SmokeRun = {
  songTimeBefore: 0,
  samples: samples((t) => 0.2 * Math.sin(4 * t)),
  canvasDrawn: true,
  errors: [],
};

describe('smokeFailures (design 9.3)', () => {
  it('passes a run in which the song time and the bow arm move', () => {
    expect(smokeFailures(PASS)).toEqual([]);
  });

  it('fails a song time that does not increase', () => {
    expect(smokeFailures({ ...PASS, samples: samples((t) => Math.sin(4 * t), 0.5) })).toEqual([
      'The song time increased by 1.500 s in 3 s.',
    ]);
  });

  it('fails a bow arm that moves only in the lift of the instruments', () => {
    const lift = samples((t) => (t < 0.3 ? t : 0.3));
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

describe('armTurnAfterLift', () => {
  it('measures the largest turn from the first sample after the lift', () => {
    const run = samples((t) => (t >= SMOKE.liftSec ? t - SMOKE.liftSec : 1));
    expect(armTurnAfterLift(run)).toBeCloseTo(3 - SMOKE.liftSec, 6);
  });
});

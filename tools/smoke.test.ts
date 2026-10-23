import { describe, expect, it } from 'vitest';

import { armTurnAfterDownbeat, cameraMove, playFailures, smokeFailures } from './smoke.ts';
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
    // The opening shot holds the default view in the count-in, then it pushes in.
    const push = songTime > 0 ? 1 - 0.01 * songTime : 1;
    const camera = [20 * push, 10 * push, 30 * push];
    return { elapsedSec: t, songTime, arm: [...turnX(armAt(songTime)), ...turnX(0)], camera };
  });
}

/** A run that passes all checks: the bow arm moves after the downbeat. */
const PASS: SmokeRun = {
  songTimeBefore: 0,
  // The default view, before the click on play.
  cameraBefore: [20, 10, 30],
  samples: samples((song) => (song < 0 ? 0 : 0.2 * Math.sin(4 * song))),
  canvasDrawn: true,
  errors: [],
  camera: {
    modeAtLoad: 'free',
    modeReduced: 'free',
    dragMove: 0.2,
    modeAfterDrag: 'free',
    modeAfterButton: 'cinematic',
    modeAfterKey: 'free',
  },
  firstPaint: { whiteShare: 0.004, ringFill: 'none' },
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

  it('fails an empty canvas and each page error', () => {
    expect(smokeFailures({ ...PASS, canvasDrawn: false, errors: ['x'] })).toEqual([
      'The canvas is empty.',
      'Page error: x',
    ]);
  });

  it('fails a first paint that is white or that shows a black load ring', () => {
    expect(
      smokeFailures({ ...PASS, firstPaint: { whiteShare: 0.95, ringFill: 'rgb(0, 0, 0)' } }),
    ).toEqual([
      'The first paint has 95.0% white pixels.',
      'The load ring of the first paint has the fill rgb(0, 0, 0).',
    ]);
  });
});

describe('playFailures (design 9.3)', () => {
  it('passes a play with only the song time, as on the built site', () => {
    const times = PASS.samples.map(({ elapsedSec, songTime }) => ({ elapsedSec, songTime }));
    expect(playFailures({ samples: times, canvasDrawn: true, errors: [] })).toEqual([]);
  });

  it('measures the increase from the first sample of the count-in', () => {
    // A slow renderer shows the song time of 0 from before the click for the first frames.
    const late = PASS.samples.map((s) => (s.elapsedSec < 1 ? { ...s, songTime: 0 } : s));
    expect(playFailures({ ...PASS, samples: late })).toEqual([]);
  });

  it('does not check the bow arm', () => {
    const lift = samples((song) => (song < 0 ? song : 0));
    expect(playFailures({ ...PASS, samples: lift })).toEqual([]);
  });
});

describe('smokeFailures for the camera (design 2.5, 5.6)', () => {
  it('fails a camera that does not move in Cinematic mode', () => {
    const still = PASS.samples.map((s) => ({ ...s, camera: [20, 10, 30] }));
    expect(smokeFailures({ ...PASS, samples: still })).toEqual([
      'The camera moved by 0.000 m only in Cinematic mode.',
    ]);
    // The last sample comes 2.38 s after the downbeat, so the push-in is 2.38% of the distance.
    expect(cameraMove(PASS)).toBeCloseTo((4 - COUNT_IN) * 0.01 * Math.hypot(20, 10, 30), 6);
  });

  it('fails a wrong mode at the load, and a drag that keeps the mode or jumps', () => {
    const camera = {
      ...PASS.camera,
      modeReduced: 'cinematic',
      dragMove: 12,
      modeAfterDrag: 'free',
    };
    expect(smokeFailures({ ...PASS, camera })).toEqual([
      'The camera mode at the load was free, and cinematic with reduced motion.',
      'A drag gave the mode free, and moved the camera by 12.000 m.',
    ]);
  });

  it('fails a button or a key C that does not toggle the mode', () => {
    const camera = { ...PASS.camera, modeAfterButton: 'free' };
    expect(smokeFailures({ ...PASS, camera })).toEqual([
      'The button gave the mode free, and the key C free.',
    ]);
  });
});

describe('armTurnAfterDownbeat', () => {
  it('measures the largest turn from the first sample at the song time 0 or later', () => {
    const run = samples((song) => (song >= 0 ? song : 1));
    expect(armTurnAfterDownbeat(run)).toBeCloseTo(4 - 1.7, 6);
  });
});

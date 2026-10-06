import { describe, expect, it } from 'vitest';

import {
  cutDecay,
  cutSustain,
  estimatePitch,
  levelEnvelope,
  mixToMono,
  onsetFrame,
  removeDc,
} from './sample-cut.ts';

const RATE = 44_100;

/** A sine tone with a level curve, at the test rate. */
function tone(seconds: number, hz: number, level: (t: number) => number): Float32Array {
  return Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = i / RATE;
    return level(t) * Math.sin(2 * Math.PI * hz * t);
  });
}

function rmsDb(data: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += (data[i] ?? 0) ** 2;
  }
  return 10 * Math.log10(sum / (to - from));
}

describe('mixToMono and removeDc', () => {
  it('averages the channels', () => {
    expect([...mixToMono([Float32Array.from([1, 0.5]), Float32Array.from([0, -0.5])])]).toEqual([
      0.5, 0,
    ]);
  });

  it('removes a constant offset', () => {
    const data = new Float32Array(RATE).fill(0.25);
    removeDc(data, RATE);

    expect(Math.abs(data.at(-1) ?? 1)).toBeLessThan(0.001);
  });
});

describe('onsetFrame', () => {
  it('finds the first loud window, less a pre-roll of 2 ms', () => {
    const data = new Float32Array(RATE);
    data.fill(0.5, 10_000);

    expect(onsetFrame(data, RATE, -45)).toBe(10_000 - Math.round(0.002 * RATE));
  });
});

describe('levelEnvelope', () => {
  it('gives the RMS of each window of 10 ms', () => {
    const envelope = levelEnvelope(new Float32Array(RATE).fill(0.5), RATE);

    expect(envelope.length).toBe(100);
    expect(envelope[50]).toBeCloseTo(0.5, 6);
  });
});

describe('cutSustain', () => {
  // A tone that rises over 0.2 s, holds for 3 s, and ends in 0.3 s.
  const source = tone(3.5, 220, (t) => Math.min(t / 0.2, 1, Math.max(0, (3.5 - t) / 0.3)) * 0.5);
  const cut = cutSustain(source, RATE, 220, { loopSec: 1, crossfadeSec: 0.2, startDb: -12 });
  const loop = cut.loop ?? { start: 0, end: 0 };

  it('loops about one second after the attack, before the release', () => {
    expect(loop.end - loop.start).toBeGreaterThan(0.99 * RATE);
    expect(loop.end - loop.start).toBeLessThan(1.01 * RATE);
    expect(loop.start).toBeGreaterThan(0.2 * RATE);
    expect(loop.end).toBeLessThan(3.2 * RATE);
  });

  it('ends the loop on the same phase as its start, with a guard after it', () => {
    // A period of 220 Hz is 200.45 frames, so a match within one frame shows the alignment.
    const end = cut.data[loop.end - 1] ?? 0;
    const beforeStart = cut.data[loop.start - 1] ?? 0;

    expect(Math.abs(end - beforeStart)).toBeLessThan(0.01);
    expect(cut.data.length).toBe(loop.end + 8);
    expect(cut.data[loop.end]).toBe(cut.data[loop.start]);
  });

  it('moves the loop end to the phase of the loop start, so that the crossfade does not dip', () => {
    // 1.0023 s of 220 Hz is 220.5 periods: an end with no move is half a period off.
    const half = cutSustain(source, RATE, 220, {
      loopSec: 1.0023,
      crossfadeSec: 0.2,
      startDb: -12,
    });
    const halfLoop = half.loop ?? { start: 0, end: 0 };
    const window = Math.round(0.01 * RATE);
    let lowest = Infinity;
    for (
      let at = halfLoop.end - Math.round(0.2 * RATE);
      at + window <= halfLoop.end;
      at += window
    ) {
      lowest = Math.min(lowest, rmsDb(half.data, at, at + window));
    }

    expect(lowest).toBeGreaterThan(rmsDb(source, RATE, 2 * RATE) - 1);
  });

  it('starts at the level that the start level sets, with a short fade-in', () => {
    // At -12 dB the rise of 0.2 s is at a quarter, so the sample skips about 50 ms.
    const skipped = source.length - (cut.data.length - 8);

    expect(skipped).toBeGreaterThan(0);
    expect(cut.data[0]).toBe(0);
  });

  it('refuses a sound that is too short for a loop', () => {
    expect(() =>
      cutSustain(
        tone(0.4, 220, () => 0.5),
        RATE,
        220,
        {
          loopSec: 1,
          crossfadeSec: 0.2,
          startDb: -12,
        },
      ),
    ).toThrow('too short');
  });
});

describe('cutDecay', () => {
  /** A tone that decays by 10 dB for each second. */
  const decaying = tone(8, 440, (t) => 0.8 * 10 ** (-t / 2));

  it('ends a sound at the floor, with a fade and no loop', () => {
    const cut = cutDecay(decaying, RATE, 440, { floorDb: -30, maxSec: 6, tailLoopSec: 0.5 });

    // -30 dB at 10 dB/s is 3 s, plus up to one window.
    expect(cut.data.length / RATE).toBeCloseTo(3, 1);
    expect(cut.loop).toBeUndefined();
    expect(cut.tail).toBeUndefined();
    expect(Math.abs(cut.data.at(-1) ?? 1)).toBeLessThan(0.001);
  });

  it('fades out at the longest length when it has no tail loop', () => {
    const cut = cutDecay(decaying, RATE, 440, { floorDb: -60, maxSec: 2, tailLoopSec: 0 });

    expect(cut.data.length).toBe(2 * RATE);
    expect(cut.loop).toBeUndefined();
  });

  it('loops a flat tail and keeps the measured decay in the envelope', () => {
    const cut = cutDecay(decaying, RATE, 440, { floorDb: -60, maxSec: 3, tailLoopSec: 0.5 });
    const loop = cut.loop ?? { start: 0, end: 0 };

    expect(cut.tail?.decayDbPerSec).toBeCloseTo(10, 0);
    expect(cut.tail?.holdSec).toBeCloseTo(3 - 0.75, 2);
    expect((loop.end - loop.start) / RATE).toBeCloseTo(0.5, 2);
    // The level of the loop is flat: its two halves differ by less than 0.5 dB.
    const middle = Math.round((loop.start + loop.end) / 2);
    expect(
      Math.abs(rmsDb(cut.data, loop.start, middle) - rmsDb(cut.data, middle, loop.end)),
    ).toBeLessThan(0.5);
  });
});

describe('estimatePitch', () => {
  it('finds a tone that is 10 cents sharp', () => {
    const hz = 440 * 2 ** (10 / 1200);
    const estimate = estimatePitch(
      tone(1, hz, () => 0.5),
      RATE,
      440,
      0,
      RATE / 2,
    );

    expect(estimate.cents).toBeCloseTo(10, 0);
    expect(estimate.confidence).toBeGreaterThan(0.99);
  });

  it('gives no confidence for a window that is too short', () => {
    expect(estimatePitch(new Float32Array(100), RATE, 440, 0, 100).confidence).toBe(0);
  });
});

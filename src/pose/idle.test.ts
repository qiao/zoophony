import { describe, expect, it } from 'vitest';

import { IDLE_MOTION, createIdleState, idleAt, idleParams } from './idle.ts';
import type { IdleState } from './idle.ts';

function stateAt(seed: number, time: number): IdleState {
  const out = createIdleState();
  idleAt(idleParams(seed), time, out);
  return out;
}

/** Samples the idle state every 10 ms over a time span. */
function samples(seed: number, from: number, to: number): IdleState[] {
  const out: IdleState[] = [];
  for (let t = from; t < to; t += 0.01) {
    out.push(stateAt(seed, t));
  }
  return out;
}

/** Counts the separate spans in which a value is above 0. */
function spans(values: readonly number[]): number {
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if ((values[i] ?? 0) > 0 && !((values[i - 1] ?? 0) > 0)) {
      count++;
    }
  }
  return count;
}

describe('idleAt (design 5.1)', () => {
  it('gives the same motion for the same seed and wall time', () => {
    expect(stateAt(7, 12.345)).toEqual(stateAt(7, 12.345));
  });

  it('blinks once in each window of 4 s, with closed eyes in the middle of a blink', () => {
    const blinks = samples(3, 0, 40).map((s) => s.blink);
    expect(spans(blinks)).toBe(10);
    expect(Math.max(...blinks)).toBeGreaterThan(0.85);
    // The eyes close and open in steps, with no jump.
    expect(blinks.some((b) => b > 0.1 && b < 0.9)).toBe(true);
    // A blink takes 0.16 s: about 16 samples of 10 ms.
    expect(blinks.filter((b) => b > 0).length).toBeLessThanOrEqual(10 * 17);
  });

  it('gives each animal its own blink times', () => {
    const a = samples(1, 0, 8).map((s) => s.blink > 0);
    const b = samples(2, 0, 8).map((s) => s.blink > 0);
    expect(a).not.toEqual(b);
  });

  it('looks at the conductor in about 45% of the windows, with eased turns', () => {
    const looks = samples(5, 0, 900).map((s) => s.look);
    const count = spans(looks);
    expect(count).toBeGreaterThan(25);
    expect(count).toBeLessThan(65);
    expect(Math.max(...looks)).toBeCloseTo(1, 2);
    // The weight changes by a small step in each 10 ms: no jump.
    for (let i = 1; i < looks.length; i++) {
      expect(Math.abs((looks[i] ?? 0) - (looks[i - 1] ?? 0))).toBeLessThan(0.05);
    }
  });

  it('breathes with a seeded period between 3.2 s and 4.4 s', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { breathSec } = idleParams(seed);
      expect(breathSec).toBeGreaterThanOrEqual(IDLE_MOTION.breathSec[0]);
      expect(breathSec).toBeLessThanOrEqual(IDLE_MOTION.breathSec[1]);
      const a = stateAt(seed, 10).breath;
      expect(stateAt(seed, 10 + breathSec).breath).toBeCloseTo(a, 9);
    }
  });

  it('twitches the ears and sways the tail within their ranges', () => {
    const states = samples(11, 0, 60);
    expect(spans(states.map((s) => s.ear))).toBeGreaterThan(0);
    for (const s of states) {
      expect(s.ear).toBeGreaterThanOrEqual(0);
      expect(s.ear).toBeLessThanOrEqual(1);
      expect(Math.abs(s.tail)).toBeLessThanOrEqual(1);
    }
  });
});

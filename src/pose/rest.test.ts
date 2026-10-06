import { describe, expect, it } from 'vitest';

import { mulberry32 } from './random.ts';
import {
  CONDUCTOR_MOTION,
  FULL_PHASE,
  LIFT_FIT_SEC,
  LOWER_MAX_SEC,
  REST_MOTION,
  REST_PHASE,
  easeMove,
  liftScale,
  moveProgress,
  phaseWeight,
  restMotion,
  restPhase,
  seatWeight,
  smoothstep,
  transportWeight,
} from './rest.ts';
import type { RestMotion } from './rest.ts';
import type { SeatAudibility, Transport } from './types.ts';

function transport(
  playing: boolean,
  changedAtWall: number | null,
  weightAtChange = 0,
  holdSec = 3,
): Transport {
  return { playing, changedAtWall, weightAtChange, startSec: 0, holdSec };
}

function seat(audible: boolean, changedAtWall: number, weightAtChange = 1): SeatAudibility {
  return { audible, changedAtWall, weightAtChange };
}

describe('transportWeight (design 5.2)', () => {
  it('keeps the rest pose before the first play', () => {
    expect(transportWeight(transport(false, null), 0)).toBe(0);
    expect(transportWeight(transport(false, null), 100)).toBe(0);
    expect(transportWeight(transport(false, 5), 6)).toBe(0);
    expect(transportWeight(transport(false, 5), 9)).toBe(0);
  });

  it('lifts the instruments in 0.3 s when play starts', () => {
    const t = transport(true, 10);
    expect(transportWeight(t, 10)).toBe(0);
    expect(transportWeight(t, 10.15)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 10.3)).toBeCloseTo(1, 9);
    expect(transportWeight(t, 50)).toBe(1);
  });

  it('keeps the instruments up for 3 s after a pause, then lowers them in 0.6 s', () => {
    const t = transport(false, 20, 1);
    expect(transportWeight(t, 20)).toBe(1);
    expect(transportWeight(t, 23)).toBe(1);
    expect(transportWeight(t, 23.3)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 23.6)).toBeCloseTo(0, 9);
    expect(transportWeight(t, 30)).toBe(0);
  });

  it('lowers the instruments at once after a pause in the count-in', () => {
    const t = transport(false, 20, 1, 0);
    expect(transportWeight(t, 20)).toBe(1);
    expect(transportWeight(t, 20.3)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 21)).toBe(0);
  });

  it('keeps the instruments up when play starts again within 3 s of a pause', () => {
    const t = transport(true, 21, 1);
    expect(transportWeight(t, 21)).toBe(1);
    expect(transportWeight(t, 21.1)).toBe(1);
  });

  it('lifts from the weight at the change after a part of the lowering', () => {
    // The pause at 20 s lowered the instruments to 0.5 at 23.3 s.
    const t = transport(true, 23.3, 0.5);
    expect(transportWeight(t, 23.3)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 23.45)).toBeCloseTo(1, 9);
  });

  it('pauses with the weight of a lift that did not end', () => {
    const t = transport(false, 10.15, 0.5);
    expect(transportWeight(t, 10.15)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 13.15)).toBeCloseTo(0.5, 9);
    expect(transportWeight(t, 13.45)).toBeCloseTo(0, 9);
  });
});

describe('seatWeight (design 5.5)', () => {
  it('keeps a seat with no change in the playing pose', () => {
    expect(seatWeight(seat(true, 0), 100)).toBe(1);
  });

  it('lowers a silent seat in 0.6 s after the change', () => {
    const s = seat(false, 10);
    expect(seatWeight(s, 10)).toBe(1);
    expect(seatWeight(s, 10.3)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 10.6)).toBeCloseTo(0, 9);
    expect(seatWeight(s, 20)).toBe(0);
  });

  it('lifts a seat that sounds again in 0.3 s', () => {
    const s = seat(true, 20, 0);
    expect(seatWeight(s, 20)).toBe(0);
    expect(seatWeight(s, 20.15)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 20.3)).toBeCloseTo(1, 9);
  });

  it('lifts from the weight at the change after a short mute', () => {
    const s = seat(true, 10.3, 0.5);
    expect(seatWeight(s, 10.3)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 10.45)).toBeCloseTo(1, 9);
  });

  it('lowers from the weight at the change after a short unmute', () => {
    const s = seat(false, 20.15, 0.5);
    expect(seatWeight(s, 20.15)).toBeCloseTo(0.5, 9);
    expect(seatWeight(s, 20.45)).toBeCloseTo(0, 9);
  });
});

describe('smoothstep', () => {
  it('eases from 0 to 1 with a flat start and end', () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(2)).toBe(1);
    expect(smoothstep(0.01)).toBeLessThan(0.001);
  });
});

describe('restPhase (design 5.2)', () => {
  it('gives a duration of 0.5 to 0.8 of the transport time, inside it', () => {
    const next = mulberry32(3);
    const spans: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const phase = restPhase(next);
      const span = phase.to - phase.from;
      expect(phase.from).toBeGreaterThanOrEqual(0);
      expect(phase.to).toBeLessThanOrEqual(1);
      expect(span).toBeGreaterThanOrEqual(REST_PHASE.spanMin);
      expect(span).toBeLessThanOrEqual(REST_PHASE.spanMax);
      spans.push(span);
    }
    expect(Math.min(...spans)).toBeLessThan(0.52);
    expect(Math.max(...spans)).toBeGreaterThan(0.78);
  });

  it('spreads the start of the lift over the time that remains', () => {
    const next = mulberry32(4);
    const phases = Array.from({ length: 1000 }, () => restPhase(next));
    expect(Math.min(...phases.map((p) => p.from))).toBeLessThan(0.01);
    expect(Math.max(...phases.map((p) => p.from))).toBeGreaterThan(0.45);
    expect(Math.max(...phases.map((p) => p.to))).toBeGreaterThan(0.99);
  });
});

describe('phaseWeight (design 5.2)', () => {
  it('follows the linear weight with the full phase', () => {
    for (const w of [0, 0.2, 0.5, 0.9, 1]) {
      expect(phaseWeight(FULL_PHASE, w)).toBe(smoothstep(w));
    }
  });

  it('lifts a player from its start to its end of the linear weight', () => {
    const phase = { from: 0.25, to: 0.75 };
    expect(phaseWeight(phase, 0)).toBe(0);
    expect(phaseWeight(phase, 0.25)).toBe(0);
    expect(phaseWeight(phase, 0.5)).toBeCloseTo(0.5, 9);
    expect(phaseWeight(phase, 0.75)).toBe(1);
    expect(phaseWeight(phase, 1)).toBe(1);
    // A lift of 0.3 s starts 0.075 s after the play and ends 0.225 s after it.
    const play = transport(true, 10);
    expect(phaseWeight(phase, transportWeight(play, 10.075))).toBeCloseTo(0, 9);
    expect(phaseWeight(phase, transportWeight(play, 10.15))).toBeCloseTo(0.5, 9);
    expect(phaseWeight(phase, transportWeight(play, 10.225))).toBeCloseTo(1, 9);
    // A lowering of 0.6 s starts 0.15 s after the hold and ends 0.45 s after it.
    const pause = transport(false, 20, 1);
    expect(phaseWeight(phase, transportWeight(pause, 23.15))).toBeCloseTo(1, 9);
    expect(phaseWeight(phase, transportWeight(pause, 23.3))).toBeCloseTo(0.5, 9);
    expect(phaseWeight(phase, transportWeight(pause, 23.45))).toBeCloseTo(0, 9);
  });
});

/** Gives the rest motions of the players of one seat, with the seeds of the plan. */
function seatMotions(seatSeed: number, count: number, family: 'bowed' | 'brass'): RestMotion[] {
  return Array.from({ length: count }, (_, index) =>
    restMotion(family, index, seatSeed, mulberry32(seatSeed * 31 + index)),
  );
}

describe('restMotion (design 5.2)', () => {
  it('gives each player a lift and a lowering in their ranges', () => {
    const m = REST_MOTION;
    for (let seatId = 0; seatId < 200; seatId++) {
      for (const motion of seatMotions(seatId, 8, seatId % 2 === 0 ? 'bowed' : 'brass')) {
        const { lift, lower } = motion;
        expect(lift.durationSec).toBeGreaterThanOrEqual(m.liftSec.min);
        expect(lift.durationSec).toBeLessThanOrEqual(m.liftSec.max);
        expect(lower.durationSec).toBeGreaterThanOrEqual(m.lowerSec.min);
        expect(lower.durationSec).toBeLessThanOrEqual(m.lowerSec.max);
        expect(lift.delaySec + lift.durationSec).toBeLessThanOrEqual(LIFT_FIT_SEC);
        expect(lower.delaySec + lower.durationSec).toBeLessThanOrEqual(LOWER_MAX_SEC);
        for (const move of [lift, lower]) {
          expect(move.skew).toBeGreaterThanOrEqual(m.skew.min);
          expect(move.skew).toBeLessThanOrEqual(m.skew.max);
        }
        expect(motion.fitSec).toBe(LIFT_FIT_SEC);
      }
    }
  });

  it('moves the principal first, and each later player of the seat after the one before', () => {
    for (let seatId = 0; seatId < 50; seatId++) {
      const motions = seatMotions(seatId, 6, 'bowed');
      for (const move of ['lift', 'lower'] as const) {
        const delays = motions.map((m) => m[move].delaySec);
        for (let i = 1; i < delays.length; i++) {
          expect(delays[i]).toBeGreaterThan(delays[i - 1] ?? Infinity);
        }
        // The principal waits only for the delay of its seat, and the ripple stays below 0.5 s.
        expect((delays.at(-1) ?? 0) - (delays[0] ?? 0)).toBeLessThan(REST_MOTION.rippleSec);
        expect((delays[1] ?? 0) - (delays[0] ?? 0)).toBeGreaterThan(0.1);
      }
    }
  });

  it('gives each move its own timing, so an early lifter does not have to lower late', () => {
    const motions = Array.from({ length: 40 }, (_, seatId) =>
      seatMotions(seatId, 4, 'bowed'),
    ).flat();
    const liftOrder = motions.map((m) => m.lift.delaySec + m.lift.durationSec);
    const lowerOrder = motions.map((m) => m.lower.delaySec + m.lower.durationSec);
    // The players that end the lift early include players that end the lowering early too.
    const early = (values: number[]): Set<number> => {
      const sorted = values.toSorted((a, b) => a - b);
      const limit = sorted[Math.floor(values.length / 4)] ?? 0;
      return new Set(values.flatMap((v, i) => (v <= limit ? [i] : [])));
    };
    const earlyLift = early(liftOrder);
    const both = [...early(lowerOrder)].filter((i) => earlyLift.has(i));
    expect(both.length).toBeGreaterThan(0);
    const durations = motions.map((m) => m.lift.durationSec);
    expect(new Set(durations).size).toBe(motions.length);
  });

  it('gives the same motion for the same seeds, and other motions for other seeds', () => {
    expect(seatMotions(7, 4, 'bowed')).toEqual(seatMotions(7, 4, 'bowed'));
    expect(seatMotions(8, 4, 'bowed')).not.toEqual(seatMotions(7, 4, 'bowed'));
  });

  it('lifts the winds a moment before the other seats', () => {
    const m = REST_MOTION.seatLiftSec;
    for (let seatId = 0; seatId < 100; seatId++) {
      const [winds] = seatMotions(seatId, 1, 'brass');
      const [strings] = seatMotions(seatId, 1, 'bowed');
      expect(winds?.lift.delaySec).toBeLessThanOrEqual(m.winds.max);
      expect(strings?.lift.delaySec).toBeGreaterThanOrEqual(m.others.min);
    }
  });

  it('spreads the starts of a seat of 4 players over the ripple', () => {
    const spreads = Array.from({ length: 100 }, (_, seatId) => {
      const delays = seatMotions(seatId, 4, 'bowed').map((m) => m.lift.delaySec);
      return (delays[3] ?? 0) - (delays[0] ?? 0);
    });
    expect(Math.min(...spreads)).toBeGreaterThan(0.25);
    expect(Math.max(...spreads)).toBeLessThan(0.5);
  });
});

describe('easeMove', () => {
  it('eases from 0 to 1 with no speed at the start and at the end', () => {
    for (const skew of [0.8, 1, 1.25]) {
      expect(easeMove(-1, skew)).toBe(0);
      expect(easeMove(0, skew)).toBe(0);
      expect(easeMove(1, skew)).toBe(1);
      expect(easeMove(2, skew)).toBe(1);
      expect(easeMove(0.01, skew)).toBeLessThan(0.001);
      expect(1 - easeMove(0.99, skew)).toBeLessThan(0.001);
      let last = 0;
      for (let x = 0.01; x <= 1; x += 0.01) {
        const value = easeMove(x, skew);
        expect(value).toBeGreaterThanOrEqual(last);
        last = value;
      }
    }
    expect(easeMove(0.5, 1)).toBeCloseTo(0.5, 9);
  });

  it('moves the largest speed earlier with a skew below 1', () => {
    expect(easeMove(0.5, 0.8)).toBeGreaterThan(easeMove(0.5, 1));
    expect(easeMove(0.5, 1.25)).toBeLessThan(easeMove(0.5, 1));
  });
});

describe('moveProgress and liftScale (design 5.2)', () => {
  const move = { delaySec: 0.2, durationSec: 0.8, skew: 1 };

  it('waits for the delay, then moves in the duration', () => {
    expect(moveProgress(move, 0, 1)).toBe(0);
    expect(moveProgress(move, 0.2, 1)).toBe(0);
    expect(moveProgress(move, 0.6, 1)).toBeCloseTo(0.5, 9);
    expect(moveProgress(move, 1, 1)).toBe(1);
  });

  it('scales the delay and the duration to fit a short count-in', () => {
    const scale = liftScale({ ...CONDUCTOR_MOTION, fitSec: 2 }, 1);
    expect(scale).toBe(0.5);
    expect(moveProgress(move, 0.1, scale)).toBe(0);
    expect(moveProgress(move, 0.3, scale)).toBeCloseTo(0.5, 9);
    expect(moveProgress(move, 0.5, scale)).toBe(1);
    expect(liftScale(CONDUCTOR_MOTION, 10)).toBe(1);
    expect(liftScale(CONDUCTOR_MOTION, Infinity)).toBe(1);
  });
});

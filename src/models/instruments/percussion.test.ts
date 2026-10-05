import { describe, expect, it } from 'vitest';

import { length, rotate, sub } from '../math.ts';
import { buildInstrument } from './catalog.ts';
import {
  TIMPANI,
  XYLOPHONE,
  buildCymbals,
  kettleCount,
  xylophoneBarPosition,
} from './percussion.ts';

describe('kettleCount', () => {
  it('gives two kettles up to C3, three up to F3, and four above (design 4.6)', () => {
    expect(kettleCount(43)).toBe(2);
    expect(kettleCount(48)).toBe(2);
    expect(kettleCount(49)).toBe(3);
    expect(kettleCount(53)).toBe(3);
    expect(kettleCount(54)).toBe(4);
  });
});

describe('buildTimpani', () => {
  it('builds the largest kettles, each with its head at the same height and its keys', () => {
    for (const count of [2, 3, 4] as const) {
      const heads = buildInstrument('timpani', count).targets.filter((t) => t.kind === 'head');
      expect(heads).toHaveLength(count);
      for (const [i, head] of heads.entries()) {
        expect(head.from[1]).toBe(TIMPANI.headHeight);
        expect(head.keys).toEqual(TIMPANI.keys[i]);
      }
      // The largest kettle is at the left of the player.
      expect(heads[0]?.from[0]).toBeLessThan(heads.at(-1)?.from[0] ?? -Infinity);
    }
  });

  it('keeps the corners of neighbor kettles at least 0.05 m apart', () => {
    const heads = buildInstrument('timpani', 4).targets.filter((t) => t.kind === 'head');
    for (let i = 0; i + 1 < heads.length; i++) {
      const gap =
        length(sub(heads[i + 1]?.from ?? [0, 0, 0], heads[i]?.from ?? [0, 0, 0])) -
        ((TIMPANI.radii[i] ?? 0) + (TIMPANI.radii[i + 1] ?? 0)) / Math.cos(Math.PI / 8);
      expect(gap).toBeGreaterThan(0.05);
    }
  });
});

describe('xylophoneBarPosition', () => {
  it('puts the natural bars side by side and the sharp bars behind them, higher', () => {
    const c = xylophoneBarPosition(72);
    const d = xylophoneBarPosition(74);
    const cSharp = xylophoneBarPosition(73);
    expect(d[0] - c[0]).toBeCloseTo(XYLOPHONE.pitch, 9);
    expect(cSharp[0]).toBeCloseTo((c[0] + d[0]) / 2, 9);
    expect(cSharp[1]).toBeGreaterThan(c[1]);
    expect(cSharp[2]).toBeLessThan(c[2]);
  });

  it('centers the bars on the player, and plays the nearest bar outside the range', () => {
    const low = xylophoneBarPosition(XYLOPHONE.keys[0]);
    const high = xylophoneBarPosition(XYLOPHONE.keys[1]);
    expect(low[0] + high[0]).toBeCloseTo(0, 9);
    expect(xylophoneBarPosition(40)).toEqual(low);
    expect(xylophoneBarPosition(120)).toEqual(high);
  });
});

describe('buildCymbals', () => {
  it('turns the inner faces of the two cymbals to each other', () => {
    const model = buildCymbals();
    const [left, right] = model.pieces;
    const inner = (rotation: readonly [number, number, number, number] | undefined) =>
      rotate(rotation ?? [0, 0, 0, 1], [0, -1, 0]);
    expect(inner(left?.hold.rotation)[0]).toBeCloseTo(1, 9);
    expect(inner(right?.hold.rotation)[0]).toBeCloseTo(-1, 9);
    expect(left?.bone).toBe('malletL');
    expect(right?.bone).toBe('malletR');
  });
});

describe('buildSmallPercussion', () => {
  it('gives the tambourine to key 54, and the triangle to the left hand', () => {
    const model = buildInstrument('small-percussion');
    const tambourine = model.targets.find((t) => t.kind === 'head');
    expect(tambourine?.keys).toEqual([54, 54]);
    expect(model.targets.find((t) => t.kind === 'bar')?.bone).toBe('malletL');
  });
});

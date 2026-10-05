import { describe, expect, it } from 'vitest';

import { hashUnit, mixHash, mulberry32 } from './random.ts';

describe('mulberry32', () => {
  it('gives the same numbers for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it('gives other numbers for another seed', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('gives numbers in [0, 1) with a mean near 0.5', () => {
    const next = mulberry32(7);
    let sum = 0;
    for (let i = 0; i < 10_000; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      sum += value;
    }
    expect(sum / 10_000).toBeCloseTo(0.5, 1);
  });
});

describe('hashUnit', () => {
  it('gives a stable value in [0, 1) for each pair', () => {
    expect(hashUnit(3, 4)).toBe(hashUnit(3, 4));
    expect(hashUnit(3, 4)).not.toBe(hashUnit(4, 3));
    expect(mixHash(3, 4)).toBeLessThan(2 ** 32);
  });

  it('spreads neighbor windows over the full range', () => {
    const values = Array.from({ length: 1000 }, (_, i) => hashUnit(9, i));
    const low = values.filter((v) => v < 0.5).length;
    expect(low).toBeGreaterThan(430);
    expect(low).toBeLessThan(570);
    expect(Math.min(...values)).toBeLessThan(0.01);
    expect(Math.max(...values)).toBeGreaterThan(0.99);
  });
});

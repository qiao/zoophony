import { describe, expect, it } from 'vitest';

import { BLOCK_BUDGET_MS, timeStats } from './measure-targets.ts';

describe('timeStats', () => {
  it('gives the nearest rank percentiles, the max, and the count above the limit', () => {
    const times = Array.from({ length: 1000 }, (_, i) => (i + 1) / 100);
    const stats = timeStats(times.toReversed(), 9.95);

    expect(stats).toEqual({
      count: 1000,
      median: 5,
      p99: 9.9,
      p999: 9.99,
      max: 10,
      maxIndex: 0,
      over: 5,
    });
  });

  it('takes the percentile at the nearest rank of a short list', () => {
    const stats = timeStats([3, 1, 2, 4, 5, 6, 7, 8, 9, 10], 100);

    expect([stats.median, stats.p99, stats.max, stats.maxIndex]).toEqual([5, 10, 10, 9]);
  });

  it('gives the values of one time', () => {
    expect(timeStats([0.5], 1)).toMatchObject({ median: 0.5, p99: 0.5, max: 0.5, over: 0 });
  });
});

describe('BLOCK_BUDGET_MS', () => {
  it('is the length of 128 frames at 48 kHz', () => {
    expect(BLOCK_BUDGET_MS).toBeCloseTo(2.667, 3);
  });
});

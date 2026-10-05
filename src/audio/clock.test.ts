import { describe, expect, it } from 'vitest';

import { addAnchor, heardTimeFromLatency, heardTimeFromTimestamp, songTimeAt } from './clock.ts';

describe('heardTimeFromTimestamp', () => {
  it('adds the time since the timestamp', () => {
    expect(heardTimeFromTimestamp({ contextTime: 10, performanceTime: 5000 }, 5250)).toBe(10.25);
  });
});

describe('heardTimeFromLatency', () => {
  it('subtracts the output latency', () => {
    expect(heardTimeFromLatency(10, 0.04, 0.01)).toBeCloseTo(9.96);
  });

  it('uses the base latency when the output latency is 0', () => {
    expect(heardTimeFromLatency(10, 0, 0.01)).toBeCloseTo(9.99);
  });
});

describe('songTimeAt', () => {
  const play = { contextTime: 2, songTime: 0, rate: 1 };

  it('gives 0 with no anchor', () => {
    expect(songTimeAt([], 5, 60)).toBe(0);
  });

  it('moves the song time with the rate after the anchor', () => {
    expect(songTimeAt([play], 3.5, 60)).toBe(1.5);
    expect(songTimeAt([{ ...play, rate: 0.5 }], 4, 60)).toBe(1);
  });

  it('keeps the song time of a pause', () => {
    expect(songTimeAt([{ contextTime: 2, songTime: 7, rate: 0 }], 9, 60)).toBe(7);
  });

  it('keeps the old anchor until the listener hears the block of the new one', () => {
    const seek = { contextTime: 10, songTime: 30, rate: 1 };
    expect(songTimeAt([play, seek], 9.9, 60)).toBeCloseTo(7.9);
    expect(songTimeAt([play, seek], 10.5, 60)).toBeCloseTo(30.5);
  });

  it('stays between 0 and the song length', () => {
    expect(songTimeAt([play], 1, 60)).toBe(0);
    expect(songTimeAt([play], 100, 60)).toBe(60);
  });
});

describe('addAnchor', () => {
  it('keeps the last four anchors', () => {
    let anchors = addAnchor([], { contextTime: 0, songTime: 0, rate: 1 });
    for (let i = 1; i < 6; i++) {
      anchors = addAnchor(anchors, { contextTime: i, songTime: i, rate: 1 });
    }
    expect(anchors.map((anchor) => anchor.contextTime)).toEqual([2, 3, 4, 5]);
  });
});

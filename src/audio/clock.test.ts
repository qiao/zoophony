import { describe, expect, it } from 'vitest';

import {
  addAnchor,
  addScoreAnchor,
  chooseHeardTime,
  heardTimeFromLatency,
  heardTimeFromTimestamp,
  songTimeAt,
} from './clock.ts';

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

describe('chooseHeardTime', () => {
  it('uses the timestamp when the two methods agree (Chrome: 2 ms apart, 32 ms latency)', () => {
    expect(chooseHeardTime(10.002, 10, 0.032)).toBe(10.002);
  });

  it('uses the latency method when the timestamp has no latency (Firefox)', () => {
    expect(chooseHeardTime(10.0227, 10, 0.0227)).toBe(10);
  });

  it('uses the timestamp when the browser gives no output latency', () => {
    expect(chooseHeardTime(10.03, 10, 0)).toBe(10.03);
  });
});

describe('songTimeAt', () => {
  const play = { contextTime: 2, songTime: 0, rate: 1, load: 1 };

  it('gives 0 with no anchor', () => {
    expect(songTimeAt([], 5, 60)).toBe(0);
  });

  it('moves the song time with the rate after the anchor', () => {
    expect(songTimeAt([play], 3.5, 60)).toBe(1.5);
    expect(songTimeAt([{ ...play, rate: 0.5 }], 4, 60)).toBe(1);
  });

  it('keeps the song time of a pause', () => {
    expect(songTimeAt([{ contextTime: 2, songTime: 7, rate: 0, load: 1 }], 9, 60)).toBe(7);
  });

  it('keeps the old anchor until the listener hears the block of the new one', () => {
    const seek = { contextTime: 10, songTime: 30, rate: 1, load: 1 };
    expect(songTimeAt([play, seek], 9.9, 60)).toBeCloseTo(7.9);
    expect(songTimeAt([play, seek], 10.5, 60)).toBeCloseTo(30.5);
  });

  it('stays at most the song length, and gives the first anchor before it', () => {
    expect(songTimeAt([play], 1, 60)).toBe(0);
    expect(songTimeAt([play], 100, 60)).toBe(60);
  });

  it('runs from below 0 in the count-in of a play (design 6.5)', () => {
    const countIn = { contextTime: 2, songTime: -0.9, rate: 1, load: 1 };
    expect(songTimeAt([countIn], 1.5, 60)).toBe(-0.9);
    expect(songTimeAt([countIn], 2.4, 60)).toBeCloseTo(-0.5);
    expect(songTimeAt([countIn], 3.4, 60)).toBeCloseTo(0.5);
  });
});

describe('addAnchor', () => {
  it('removes the anchors before the last one at or before the window', () => {
    let anchors = addAnchor([], { contextTime: 0, songTime: 0, rate: 1, load: 1 });
    for (const contextTime of [1, 2, 3, 3.5, 4.2]) {
      anchors = addAnchor(anchors, { contextTime, songTime: contextTime, rate: 1, load: 1 });
    }
    expect(anchors.map((anchor) => anchor.contextTime)).toEqual([3, 3.5, 4.2]);
  });

  it('keeps the anchor in effect when more than four anchors wait to be heard', () => {
    // A drag of the seek bar sends a seek each frame. With 150 ms of Bluetooth latency, the
    // listener still hears the play anchor when seven seek anchors have arrived.
    let anchors = addAnchor([], { contextTime: 2, songTime: 0, rate: 1, load: 1 });
    for (let i = 0; i < 7; i++) {
      anchors = addAnchor(anchors, {
        contextTime: 10 + i * 0.0167,
        songTime: 30 + i,
        rate: 1,
        load: 1,
      });
    }
    const heard = 10.1 - 0.15;
    expect(songTimeAt(anchors, heard, 60)).toBeCloseTo(7.95);
  });
});

describe('addScoreAnchor', () => {
  it('adds an anchor of the current score, and ignores an anchor of an older score', () => {
    const current = { contextTime: 3, songTime: 0, rate: 0, load: 2 };
    const old = { contextTime: 2.9, songTime: 40, rate: 1, load: 1 };
    const anchors = addScoreAnchor([], current, 2);
    expect(anchors).toEqual([current]);
    expect(addScoreAnchor(anchors, old, 2)).toEqual([current]);
  });
});

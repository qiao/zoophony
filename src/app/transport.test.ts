import { describe, expect, it } from 'vitest';

import { transportWeight } from '../pose/rest.ts';
import { NOT_STARTED, STOPPED, changeTransport, followSongTime, setPlaying } from './transport.ts';

describe('changeTransport (design 5.1, 5.2)', () => {
  it('records the time of each change and the weight of the playing pose at it', () => {
    const played = changeTransport(NOT_STARTED, true, 10);
    expect(played).toEqual({ playing: true, changedAtWall: 10, weightAtChange: 0 });
    const paused = changeTransport(played, false, 12.5);
    expect(paused).toEqual({ playing: false, changedAtWall: 12.5, weightAtChange: 1 });
    // 3.3 s after the pause, the instruments are half way down.
    expect(changeTransport(paused, true, 15.8)).toEqual({
      playing: true,
      changedAtWall: 15.8,
      weightAtChange: expect.closeTo(0.5, 9),
    });
  });

  it('moves the instruments with no jump after fast changes (review of step 5, F8)', () => {
    // A play at 0 s, a pause at 0.1 s, and a play at 0.2 s.
    const first = changeTransport(NOT_STARTED, true, 0);
    const pause = changeTransport(first, false, 0.1);
    const again = changeTransport(pause, true, 0.2);
    expect(transportWeight(pause, 0.1)).toBeCloseTo(1 / 3, 9);
    expect(transportWeight(pause, 0.2)).toBeCloseTo(1 / 3, 9);
    expect(transportWeight(again, 0.2)).toBeCloseTo(1 / 3, 9);
    expect(transportWeight(again, 0.3)).toBeCloseTo(2 / 3, 9);
    expect(transportWeight(again, 0.4)).toBeCloseTo(1, 9);
    // A pause in a lift that did not end holds that weight for 3 s, then lowers it.
    const late = changeTransport(again, false, 0.25);
    expect(transportWeight(late, 0.25)).toBeCloseTo(0.5, 9);
    expect(transportWeight(late, 3.25)).toBeCloseTo(0.5, 9);
    expect(transportWeight(late, 3.55)).toBeCloseTo(0, 9);
  });

  it('keeps the transport for a play while it plays, and for a pause before the first play', () => {
    const played = changeTransport(NOT_STARTED, true, 10);
    expect(changeTransport(played, true, 11)).toBe(played);
    expect(changeTransport(NOT_STARTED, false, 11)).toBe(NOT_STARTED);
  });
});

describe('followSongTime (design 6.5)', () => {
  const duration = 1.9;

  it('pauses the transport when the song time reaches the song length', () => {
    let state = setPlaying(STOPPED, true, 10);
    state = followSongTime(state, 0.5, duration, 10.5);
    expect(state.transport.playing).toBe(true);
    state = followSongTime(state, duration, duration, 11.9);
    expect(state.transport).toEqual({ playing: false, changedAtWall: 11.9, weightAtChange: 1 });
  });

  it('keeps a play at the song end while now() still gives the old end time', () => {
    let state = setPlaying(STOPPED, true, 10);
    state = followSongTime(state, 1, duration, 11);
    state = followSongTime(state, duration, duration, 11.9);
    state = setPlaying(state, true, 13);
    // The old anchor holds the song end until the listener hears the restart at 0.
    state = followSongTime(state, duration, duration, 13.016);
    state = followSongTime(state, duration, duration, 13.033);
    expect(state.transport.playing).toBe(true);
    state = followSongTime(state, 0.015, duration, 13.05);
    expect(state.transport.playing).toBe(true);
    // After the song time reads less than the end, the end check works again.
    state = followSongTime(state, duration, duration, 14.9);
    expect(state.transport.playing).toBe(false);
  });

  it('does not change a paused transport', () => {
    expect(followSongTime(STOPPED, duration, duration, 5)).toBe(STOPPED);
    const paused = setPlaying(setPlaying(STOPPED, true, 1), false, 2);
    expect(followSongTime(paused, duration, duration, 5)).toBe(paused);
  });

  it('keeps the state for a play while it plays', () => {
    const played = followSongTime(setPlaying(STOPPED, true, 1), 0.2, duration, 1.1);
    expect(setPlaying(played, true, 2)).toBe(played);
  });
});

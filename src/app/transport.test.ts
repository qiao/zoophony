import { describe, expect, it } from 'vitest';

import { note, tempo, timeSignature, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { seatWeight, transportWeight } from '../pose/rest.ts';
import {
  NOT_STARTED,
  STOPPED,
  changeAudibility,
  changeTransport,
  followSongTime,
  seekPlayState,
  setPlaying,
  startPlay,
  startPoint,
} from './transport.ts';

describe('startPoint (design 6.5)', () => {
  it('starts at the pause point, and at 0 at the song end', () => {
    expect(startPoint(3.2, 60)).toBe(3.2);
    expect(startPoint(60, 60)).toBe(0);
    expect(startPoint(61, 60)).toBe(0);
  });

  it('starts at 0 when the clock still reads the count-in of the play before', () => {
    expect(startPoint(-0.3, 60)).toBe(0);
  });
});

describe('changeTransport (design 5.1, 5.2)', () => {
  it('records the time of each change and the weight of the playing pose at it', () => {
    const played = changeTransport(NOT_STARTED, true, 10, 0);
    expect(played).toEqual({
      playing: true,
      changedAtWall: 10,
      weightAtChange: 0,
      startSec: 0,
      holdSec: 3,
    });
    const paused = changeTransport(played, false, 12.5, 1.6);
    expect(paused).toEqual({
      playing: false,
      changedAtWall: 12.5,
      weightAtChange: 1,
      startSec: 0,
      holdSec: 3,
    });
    // 3.3 s after the pause, the instruments are half way down.
    expect(changeTransport(paused, true, 15.8, 1.6)).toEqual({
      playing: true,
      changedAtWall: 15.8,
      weightAtChange: expect.closeTo(0.5, 9),
      startSec: 1.6,
      holdSec: 3,
    });
  });

  it('lowers the instruments at once after a pause in the count-in', () => {
    // A play from the song start at 10 s. The count-in runs from below 0 to the downbeat.
    const played = changeTransport(NOT_STARTED, true, 10, 0);
    const paused = changeTransport(played, false, 10.5, -0.6);
    expect(paused).toMatchObject({ playing: false, startSec: 0, holdSec: 0 });
    expect(transportWeight(paused, 10.5)).toBe(1);
    expect(transportWeight(paused, 10.8)).toBeCloseTo(0.5, 9);
    expect(transportWeight(paused, 11.2)).toBe(0);
    // The first frames after a play still read the start point from the old anchor.
    expect(changeTransport(played, false, 10.01, 0).holdSec).toBe(0);
  });

  it('moves the instruments with no jump after fast changes (review of step 5, F8)', () => {
    // A play at 0 s, a pause at 0.1 s, and a play at 0.2 s, in the middle of the song.
    const first = changeTransport(NOT_STARTED, true, 0, 5);
    const pause = changeTransport(first, false, 0.1, 5.1);
    const again = changeTransport(pause, true, 0.2, 5.1);
    expect(transportWeight(pause, 0.1)).toBeCloseTo(1 / 3, 9);
    expect(transportWeight(pause, 0.2)).toBeCloseTo(1 / 3, 9);
    expect(transportWeight(again, 0.2)).toBeCloseTo(1 / 3, 9);
    expect(transportWeight(again, 0.3)).toBeCloseTo(2 / 3, 9);
    expect(transportWeight(again, 0.4)).toBeCloseTo(1, 9);
    // A pause in a lift that did not end holds that weight for 3 s, then lowers it.
    const late = changeTransport(again, false, 0.25, 5.15);
    expect(transportWeight(late, 0.25)).toBeCloseTo(0.5, 9);
    expect(transportWeight(late, 3.25)).toBeCloseTo(0.5, 9);
    expect(transportWeight(late, 3.55)).toBeCloseTo(0, 9);
  });

  it('keeps the transport for a play while it plays, and for a pause before the first play', () => {
    const played = changeTransport(NOT_STARTED, true, 10, 0);
    expect(changeTransport(played, true, 11, 1)).toBe(played);
    expect(changeTransport(NOT_STARTED, false, 11, 0)).toBe(NOT_STARTED);
  });
});

describe('changeAudibility (design 5.5, 6.6)', () => {
  it('lowers a seat with no change from the playing pose', () => {
    const muted = changeAudibility(undefined, false, 10);
    expect(muted).toEqual({ audible: false, changedAtWall: 10, weightAtChange: 1 });
    expect(changeAudibility(undefined, true, 10)).toBeUndefined();
    expect(changeAudibility(muted, false, 11)).toBe(muted);
  });

  it('moves the instruments with no jump after fast changes', () => {
    // A mute at 0 s, an unmute at 0.3 s, and a mute at 0.4 s.
    const muted = changeAudibility(undefined, false, 0);
    const back = changeAudibility(muted, true, 0.3);
    const again = changeAudibility(back, false, 0.4);
    if (!back || !again) {
      throw new Error('Each change gives an audibility.');
    }
    expect(seatWeight(back, 0.3)).toBeCloseTo(0.5, 9);
    expect(seatWeight(back, 0.4)).toBeCloseTo(0.5 + 1 / 3, 9);
    expect(seatWeight(again, 0.4)).toBeCloseTo(0.5 + 1 / 3, 9);
    expect(seatWeight(again, 0.7)).toBeCloseTo(1 / 3, 9);
  });
});

describe('followSongTime (design 6.5)', () => {
  const duration = 1.9;

  it('pauses the transport when the song time reaches the song length', () => {
    let state = setPlaying(STOPPED, true, 10, 0);
    state = followSongTime(state, 0.5, duration, 10.5);
    expect(state.transport.playing).toBe(true);
    state = followSongTime(state, duration, duration, 11.9);
    expect(state.transport).toEqual({
      playing: false,
      changedAtWall: 11.9,
      weightAtChange: 1,
      startSec: 0,
      holdSec: 3,
    });
  });

  it('keeps a play at the song end while now() still gives the old end time', () => {
    let state = setPlaying(STOPPED, true, 10, 0);
    state = followSongTime(state, 1, duration, 11);
    state = followSongTime(state, duration, duration, 11.9);
    state = setPlaying(state, true, 13, 0);
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
    const paused = setPlaying(setPlaying(STOPPED, true, 1, 0), false, 2, 0.5);
    expect(followSongTime(paused, duration, duration, 5)).toBe(paused);
  });

  it('keeps the state for a play while it plays', () => {
    const played = followSongTime(setPlaying(STOPPED, true, 1, 0), 0.2, duration, 1.1);
    expect(setPlaying(played, true, 2, 0.2)).toBe(played);
  });
});

describe('startPlay (design 5.4, 6.5)', () => {
  /** Eight bars of 2/4 at 192 BPM, as the Beethoven demo: one conducted beat of 0.625 s in each bar. */
  const score = scoreOf({
    tracks: [[tempo(0, 192), timeSignature(0, 2, 4)], track([], note(0, 0, 60, 8 * 960))],
  });
  const beats = Float64Array.from(score.beats, (beat) => beat.timeSec);
  const duration = score.durationSec;

  it('starts the first play with the ready pause and one beat', () => {
    const start = startPlay(STOPPED, 0, duration, beats, 10);
    expect(start.countInSec).toBeCloseTo(1.225, 9);
    expect(start.state.transport).toMatchObject({ playing: true, startSec: 0 });
    expect(start.state.endPending).toBe(true);
  });

  it('starts again from 0 with the full count-in at the song end', () => {
    const start = startPlay(STOPPED, duration, duration, beats, 10);
    expect(start.state.transport.startSec).toBe(0);
    expect(start.countInSec).toBeCloseTo(1.225, 9);
  });

  it('gives only one beat after a pause in the song', () => {
    const start = startPlay(STOPPED, 2.2, duration, beats, 10);
    expect(start.state.transport.startSec).toBe(2.2);
    expect(start.countInSec).toBeCloseTo(0.625, 9);
  });
});

describe('seekPlayState (design 5.2, 6.5)', () => {
  it('moves the start point of a play to the seek point', () => {
    const playing = setPlaying(STOPPED, true, 10, 60);
    const sought = seekPlayState(playing, 30);
    expect(sought.transport).toEqual({ ...playing.transport, startSec: 30 });
    // A pause after the seek, before the old start point, keeps the hold of 3 s.
    expect(setPlaying(sought, false, 12, 31).transport.holdSec).toBe(3);
  });

  it('keeps the transport of a seek while paused', () => {
    const paused = setPlaying(setPlaying(STOPPED, true, 10, 0), false, 12, 2);
    expect(seekPlayState(paused, 30)).toBe(paused);
  });
});

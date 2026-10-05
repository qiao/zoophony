import { describe, expect, it } from 'vitest';

import { loadShare, loadText, playAction, playLabel, showsFirstScreen } from './play-control.ts';
import type { PieceStatus } from './play-control.ts';

/** A piece on the first screen, with its samples ready. */
const READY: PieceStatus = {
  samples: 'ready',
  playing: false,
  playWhenReady: false,
  played: false,
};

describe('the play button of the bar (design 2.4)', () => {
  it('plays and pauses when the samples are ready', () => {
    expect(playAction(READY)).toBe('play');
    expect(playLabel(READY)).toBe('Play');
    const playing = { ...READY, playing: true, played: true };
    expect(playAction(playing)).toBe('pause');
    expect(playLabel(playing)).toBe('Pause');
  });

  it('waits for the samples, and a second click cancels the wait', () => {
    const loading: PieceStatus = { ...READY, samples: 'loading' };
    expect(playAction(loading)).toBe('wait');
    expect(playLabel(loading)).toBe('Play');
    const waiting = { ...loading, playWhenReady: true };
    expect(playAction(waiting)).toBe('cancel');
    expect(playLabel(waiting)).toBe('Pause');
  });

  it('shows "Play" after a failure, and a click tries again (review of step 5, F9)', () => {
    const failed: PieceStatus = { ...READY, samples: 'failed', played: true };
    expect(playAction(failed)).toBe('retry');
    expect(playLabel(failed)).toBe('Play');
    // The transport pauses on a failure. Until then, the button still offers a retry.
    expect(playAction({ ...failed, playing: true })).toBe('retry');
    expect(playLabel({ ...failed, playing: true })).toBe('Play');
  });
});

describe('showsFirstScreen (design 2.2)', () => {
  it('shows the first screen until the first play of the piece', () => {
    expect(showsFirstScreen(READY)).toBe(true);
    expect(showsFirstScreen({ ...READY, samples: 'loading', playWhenReady: true })).toBe(true);
    expect(showsFirstScreen({ ...READY, played: true })).toBe(false);
  });
});

describe('the load text and the load ring (design 2.8)', () => {
  it('gives the text of the spec and the part of the ring', () => {
    expect(loadText({ done: 4, total: 12 })).toBe('Loading instruments: 4 of 12');
    expect(loadShare({ done: 4, total: 16 })).toBe(0.25);
  });

  it('gives no text and an empty ring before the first file', () => {
    expect(loadText(null)).toBe('');
    expect(loadText({ done: 0, total: 0 })).toBe('');
    expect(loadShare(null)).toBe(0);
    expect(loadShare({ done: 0, total: 0 })).toBe(0);
  });
});

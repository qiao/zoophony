import { describe, expect, it } from 'vitest';

import {
  WAIT_TEXT,
  firstScreenView,
  loadShare,
  loadText,
  noPieceStatus,
  playAction,
  playLabel,
  showsFirstScreen,
} from './play-control.ts';
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

describe('noPieceStatus (design 2.2, review of step 6, B2)', () => {
  it('shows the load on the first screen until the first piece shows', () => {
    const status = noPieceStatus(false, false);
    expect(status.samples).toBe('loading');
    expect(showsFirstScreen(status)).toBe(true);
    expect(playLabel(status)).toBe('Play');
  });

  it('offers a retry on the first screen after the first demo file did not load', () => {
    const status = noPieceStatus(true, false);
    expect(status.samples).toBe('failed');
    expect(showsFirstScreen(status)).toBe(true);
    expect(playLabel(status)).toBe('Play');
    expect(playAction(status)).toBe('retry');
  });
});

describe('the play button of the first screen (design 2.2, audit 2026-10-05-ux-design, LD1)', () => {
  const loading: PieceStatus = { ...READY, samples: 'loading' };

  it('shows "Play" and the load text while the samples load', () => {
    const view = firstScreenView(loading, { done: 4, total: 12 });
    expect(view.waiting).toBe(false);
    expect(view.playLabel).toBe('Play');
    expect(view.loadText).toBe('Loading instruments: 4 of 12');
  });

  it('shows the waiting state after a click during the load, as the bar does', () => {
    const waiting = { ...loading, playWhenReady: true };
    const view = firstScreenView(waiting, { done: 4, total: 12 });
    expect(view.shown).toBe(true);
    expect(view.waiting).toBe(true);
    expect(view.playLabel).toBe(playLabel(waiting));
    expect(view.playLabel).toBe('Pause');
    expect(view.loadText).toBe(`Loading instruments: 4 of 12\n${WAIT_TEXT}`);
    // A second click cancels the wait.
    expect(playAction(waiting)).toBe('cancel');
  });

  it('waits for the first piece after a click before it shows', () => {
    const status = noPieceStatus(false, true);
    expect(firstScreenView(status, null).waiting).toBe(true);
    expect(playAction(status)).toBe('cancel');
    // After a failed demo file, a click loads the file again and does not wait.
    expect(noPieceStatus(true, true).playWhenReady).toBe(false);
  });

  it('has no waiting state when the samples are ready', () => {
    const view = firstScreenView({ ...READY, playWhenReady: true }, { done: 12, total: 12 });
    expect(view.waiting).toBe(false);
    expect(view.loading).toBe(false);
    expect(view.loadText).toBe('');
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

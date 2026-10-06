import type { FirstScreenView } from '../ui/first-screen.ts';

/** The state of the samples of the current piece in the `Player`. */
export type SampleState = 'loading' | 'ready' | 'failed';

/** The state of the current piece that the play buttons show. */
export interface PieceStatus {
  readonly samples: SampleState;
  /** True while the transport plays. */
  readonly playing: boolean;
  /**
   * True if the piece starts when its samples are ready (design 2.2, 2.4): after a selection,
   * after a click on play during the load, and after a click on play after a failure.
   */
  readonly playWhenReady: boolean;
  /** True after the first play of the piece. Until then, the first screen shows (2.2). */
  readonly played: boolean;
}

/**
 * Gives the state of the play buttons before the first piece shows (design 2.2). After the file
 * of the first demo did not load, the samples count as failed: the first screen shows "Play"
 * with no load ring, and a click loads the file again.
 *
 * A click on play before the first piece shows waits for it, as a click during the load does.
 *
 * @param fileFailed True after the file of the first demo did not load.
 * @param playWhenShown True after a click on play before the first piece shows.
 * @returns The state.
 */
export function noPieceStatus(fileFailed: boolean, playWhenShown: boolean): PieceStatus {
  return {
    samples: fileFailed ? 'failed' : 'loading',
    playing: false,
    playWhenReady: !fileFailed && playWhenShown,
    played: false,
  };
}

/**
 * What a click on the play button of the bar does:
 *
 * - `play` and `pause`: the transport plays or pauses.
 * - `wait`: the piece starts when its samples are ready.
 * - `cancel`: the piece does not start when its samples are ready.
 * - `retry`: the app loads the audio again after a failure, and plays when it is ready.
 */
export type PlayAction = 'play' | 'pause' | 'wait' | 'cancel' | 'retry';

/**
 * Gives the action of a click on the play button of the bar (design 2.4). Play waits until the
 * samples are ready. After a failed load or an audio failure, a click loads the audio again
 * (review of step 5, F9).
 *
 * @param status The state of the current piece.
 * @returns The action.
 */
export function playAction(status: PieceStatus): PlayAction {
  if (status.samples === 'failed') {
    return 'retry';
  }
  if (status.samples === 'loading') {
    return status.playWhenReady ? 'cancel' : 'wait';
  }
  return status.playing ? 'pause' : 'play';
}

/**
 * Gives the label of the play button of the bar. While the piece waits for its samples to play,
 * the button shows "Pause", so that a click can cancel the wait.
 *
 * @param status The state of the current piece.
 * @returns "Play" or "Pause".
 */
export function playLabel(status: PieceStatus): 'Play' | 'Pause' {
  return waitsForSamples(status) || (status.samples === 'ready' && status.playing)
    ? 'Pause'
    : 'Play';
}

/**
 * Tells if the piece waits for its samples to play: after a click on play during the load, or
 * after a selection (design 2.2).
 *
 * @param status The state of the current piece.
 * @returns True while the piece waits.
 */
export function waitsForSamples(status: PieceStatus): boolean {
  return status.samples === 'loading' && status.playWhenReady;
}

/**
 * Tells if the first screen shows: the large play button, the load ring, and the load text
 * (design 2.2, 2.8). It shows until the first play of the piece. A newly selected piece shows it
 * while its samples load, and starts when they are ready.
 *
 * @param status The state of the current piece.
 * @returns True if the first screen shows.
 */
export function showsFirstScreen(status: PieceStatus): boolean {
  return !status.played;
}

/** The progress of the load of the samples: the decoded files of all files. */
export interface LoadProgress {
  readonly done: number;
  readonly total: number;
}

/**
 * Gives the load text of the first screen (design 2.8).
 *
 * @param progress The progress, or `null` before the first file arrives.
 * @returns The text, for example "Loading instruments: 4 of 12", or '' with no progress.
 */
export function loadText(progress: LoadProgress | null): string {
  if (!progress || progress.total === 0) {
    return '';
  }
  return `Loading instruments: ${progress.done} of ${progress.total}`;
}

/** The second line of the load text while the piece waits for its samples (design 2.8). */
export const WAIT_TEXT = 'The music starts after the load.';

/**
 * Gives the state of the first screen in one frame (design 2.2, 2.8). The large play button
 * follows the rules of the play button of the bar: while the piece waits for its samples, it
 * shows "Pause", the ring turns, and the load text gets {@link WAIT_TEXT}. A second click
 * cancels the wait.
 *
 * @param status The state of the current piece.
 * @param progress The progress of the load, or `null` before the first file arrives.
 * @returns The view of the first screen.
 */
export function firstScreenView(
  status: PieceStatus,
  progress: LoadProgress | null,
): FirstScreenView {
  const loading = status.samples === 'loading';
  const waiting = waitsForSamples(status);
  const text = loading ? loadText(progress) : '';
  return {
    shown: showsFirstScreen(status),
    loading,
    waiting,
    playLabel: playLabel(status),
    loadShare: loadShare(progress),
    loadText: waiting ? [text, WAIT_TEXT].filter((line) => line !== '').join('\n') : text,
  };
}

/**
 * Gives the part of the load ring that shows the progress.
 *
 * @param progress The progress, or `null` before the first file arrives.
 * @returns The part from 0 to 1.
 */
export function loadShare(progress: LoadProgress | null): number {
  if (!progress || progress.total === 0) {
    return 0;
  }
  return Math.min(1, progress.done / progress.total);
}

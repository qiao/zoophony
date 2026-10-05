/**
 * The state of the samples of the current demo, for the temporary play button. Step 6 replaces
 * the button with the bar and the messages of design 2.8.
 */
export type SampleState = 'loading' | 'ready' | 'failed';

/** What the temporary button shows. */
export interface ButtonView {
  readonly label: 'Loading' | 'Play' | 'Pause';
  readonly disabled: boolean;
}

/** What a click on the temporary button does. */
export type ButtonAction = 'retry' | 'play' | 'pause' | 'none';

/**
 * Gives the view of the temporary button. After a failed load or an audio failure, the button
 * shows "Play" again, so that a click can try again.
 *
 * @param samples The state of the samples of the current demo.
 * @param playing True while the transport plays.
 * @returns The label and the disabled state.
 */
export function buttonView(samples: SampleState, playing: boolean): ButtonView {
  if (samples === 'loading') {
    return { label: 'Loading', disabled: true };
  }
  return { label: samples === 'ready' && playing ? 'Pause' : 'Play', disabled: false };
}

/**
 * Gives the action of a click on the temporary button.
 *
 * @param samples The state of the samples of the current demo.
 * @param playing True while the transport plays.
 * @returns `retry` to load the audio and the samples again after a failure, `play`, `pause`, or
 *   `none` while the samples load.
 */
export function buttonAction(samples: SampleState, playing: boolean): ButtonAction {
  if (samples === 'failed') {
    return 'retry';
  }
  if (samples === 'loading') {
    return 'none';
  }
  return playing ? 'pause' : 'play';
}

/** The audio session of Safari (the Audio Session API): its type sets how the page plays sound. */
export interface AudioSessionLike {
  type: string;
}

/** The part of `navigator` that {@link playWithSilentSwitch} uses. A test can give a fake. */
export interface AudioSessionHost {
  readonly audioSession?: AudioSessionLike;
}

/**
 * Sets the audio session of the page to `playback`, when the browser has the API (design 2.4).
 * On iOS, the silent switch mutes Web Audio, but a page with a `playback` session plays with the
 * switch on, as a music app does. Call it before the page makes its `AudioContext`.
 *
 * @param host The navigator of the page.
 * @returns True if the browser has the API.
 */
export function playWithSilentSwitch(host: AudioSessionHost): boolean {
  if (!host.audioSession) {
    return false;
  }
  host.audioSession.type = 'playback';
  return true;
}

declare global {
  interface Navigator {
    /** The audio session of Safari 16.4 and later. The DOM types of TypeScript do not have it. */
    readonly audioSession?: AudioSessionLike;
  }
}

/** The audio session of Safari (the Audio Session API): its type sets how the page plays sound. */
interface AudioSessionLike {
  type: string;
}

/** The part of `navigator` that {@link playWithSilentSwitch} uses. A test can give a fake. */
interface AudioSessionHost {
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

/** The part of `navigator` that {@link warmAudioOutput} uses. A test can give a fake. */
interface MediaDevicesHost {
  /** The media devices. A page that is not a secure context has none. */
  readonly mediaDevices?: Pick<MediaDevices, 'enumerateDevices'>;
}

/**
 * Starts the audio output service of the browser before the page makes its `AudioContext`
 * (design 6.3, 7.2). In Chrome, the first `AudioContext` of a browser waits on the main thread
 * until the audio service starts: about 145 ms on the development Mac. The list of the media
 * devices starts the service with no wait on the main thread, and the next `AudioContext` then
 * takes about 1 ms. The list needs no permission, and the app does not read it.
 *
 * @param host The navigator of the page.
 * @returns A promise that resolves when the list arrives, or at once with no API. It never
 *   rejects.
 */
export async function warmAudioOutput(host: MediaDevicesHost): Promise<void> {
  if (!host.mediaDevices) {
    return;
  }
  await host.mediaDevices.enumerateDevices().catch(() => undefined);
}

declare global {
  interface Navigator {
    /** The audio session of Safari 16.4 and later. The DOM types of TypeScript do not have it. */
    readonly audioSession?: AudioSessionLike;
  }
}

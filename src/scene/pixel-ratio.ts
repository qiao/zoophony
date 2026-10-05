/** The part of a media query list that {@link watchPixelRatio} uses. */
export interface MediaChangeSource {
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/** The part of a window that {@link watchPixelRatio} reads. */
export interface PixelRatioSource {
  readonly devicePixelRatio: number;
  matchMedia(query: string): MediaChangeSource;
}

/**
 * Calls a function each time the `devicePixelRatio` of a window changes, for example after a
 * browser zoom or a move to a display with another pixel density. A media query on the current
 * resolution changes when the ratio changes. Then a new query watches the new ratio.
 *
 * @param source The window.
 * @param onChange The function to call after each change.
 * @returns A function that stops the watch.
 */
export function watchPixelRatio(source: PixelRatioSource, onChange: () => void): () => void {
  let query = source.matchMedia(`(resolution: ${source.devicePixelRatio}dppx)`);
  const listener = (): void => {
    query.removeEventListener('change', listener);
    query = source.matchMedia(`(resolution: ${source.devicePixelRatio}dppx)`);
    query.addEventListener('change', listener);
    onChange();
  };
  query.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
  };
}

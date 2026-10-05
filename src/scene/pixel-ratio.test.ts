import { describe, expect, it } from 'vitest';

import { watchPixelRatio } from './pixel-ratio.ts';
import type { MediaChangeSource, PixelRatioSource } from './pixel-ratio.ts';

/** A media query of a fake window. `change()` calls its listeners. */
class FakeQuery implements MediaChangeSource {
  readonly media: string;
  readonly listeners = new Set<() => void>();

  constructor(media: string) {
    this.media = media;
  }

  addEventListener(_type: 'change', listener: () => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: () => void): void {
    this.listeners.delete(listener);
  }

  change(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** A window with a `devicePixelRatio` that a test sets. */
class FakeWindow implements PixelRatioSource {
  devicePixelRatio = 2;
  readonly queries: FakeQuery[] = [];

  matchMedia(query: string): FakeQuery {
    const fake = new FakeQuery(query);
    this.queries.push(fake);
    return fake;
  }

  /** The query that has a listener now. */
  get watched(): FakeQuery | undefined {
    return this.queries.find((query) => query.listeners.size > 0);
  }
}

describe('watchPixelRatio', () => {
  it('reports each change of the ratio, and then watches the new ratio', () => {
    const win = new FakeWindow();
    let changes = 0;
    watchPixelRatio(win, () => {
      changes++;
    });
    expect(win.watched?.media).toBe('(resolution: 2dppx)');

    // A browser zoom of 110% on a display of ratio 2.
    win.devicePixelRatio = 2.2;
    win.watched?.change();
    expect(changes).toBe(1);
    expect(win.watched?.media).toBe('(resolution: 2.2dppx)');

    // A move to a display of ratio 1.
    win.devicePixelRatio = 1;
    win.watched?.change();
    expect(changes).toBe(2);
    expect(win.watched?.media).toBe('(resolution: 1dppx)');
    expect(win.queries.filter((query) => query.listeners.size > 0)).toHaveLength(1);
  });

  it('stops the watch', () => {
    const win = new FakeWindow();
    const stop = watchPixelRatio(win, () => {
      throw new Error('The watch did not stop.');
    });
    stop();
    expect(win.watched).toBeUndefined();
  });
});

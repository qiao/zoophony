import { describe, expect, it } from 'vitest';

import { NOT_STARTED, changeTransport } from './transport.ts';

describe('changeTransport (design 5.1, 5.2)', () => {
  it('records the time of each change and of the change before it', () => {
    const played = changeTransport(NOT_STARTED, true, 10);
    expect(played).toEqual({ playing: true, changedAtWall: 10, previousChangeAtWall: null });
    const paused = changeTransport(played, false, 12.5);
    expect(paused).toEqual({ playing: false, changedAtWall: 12.5, previousChangeAtWall: 10 });
    expect(changeTransport(paused, true, 13)).toEqual({
      playing: true,
      changedAtWall: 13,
      previousChangeAtWall: 12.5,
    });
  });

  it('keeps the transport for a play while it plays, and for a pause before the first play', () => {
    const played = changeTransport(NOT_STARTED, true, 10);
    expect(changeTransport(played, true, 11)).toBe(played);
    expect(changeTransport(NOT_STARTED, false, 11)).toBe(NOT_STARTED);
  });
});

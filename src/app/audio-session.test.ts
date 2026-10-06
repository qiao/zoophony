import { describe, expect, it } from 'vitest';

import { playWithSilentSwitch } from './audio-session.ts';

describe('playWithSilentSwitch (design 2.4)', () => {
  it('sets the audio session to playback when the browser has the API', () => {
    const host = { audioSession: { type: 'auto' } };
    expect(playWithSilentSwitch(host)).toBe(true);
    expect(host.audioSession.type).toBe('playback');
  });

  it('does nothing in a browser with no audio session', () => {
    expect(playWithSilentSwitch({})).toBe(false);
  });
});

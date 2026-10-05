import { describe, expect, it } from 'vitest';

import { buttonAction, buttonView } from './play-button.ts';

describe('the temporary play button (review of step 5, F9)', () => {
  it('waits for the samples, then plays and pauses', () => {
    expect(buttonView('loading', false)).toEqual({ label: 'Loading', disabled: true });
    expect(buttonAction('loading', false)).toBe('none');
    expect(buttonView('ready', false)).toEqual({ label: 'Play', disabled: false });
    expect(buttonAction('ready', false)).toBe('play');
    expect(buttonView('ready', true)).toEqual({ label: 'Pause', disabled: false });
    expect(buttonAction('ready', true)).toBe('pause');
  });

  it('shows "Play" after a failure, and a click tries again', () => {
    expect(buttonView('failed', false)).toEqual({ label: 'Play', disabled: false });
    expect(buttonAction('failed', false)).toBe('retry');
    // The transport pauses on a failure. Until then, the button still offers a retry.
    expect(buttonView('failed', true)).toEqual({ label: 'Play', disabled: false });
    expect(buttonAction('failed', true)).toBe('retry');
  });
});

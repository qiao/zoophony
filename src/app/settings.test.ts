import { describe, expect, it } from 'vitest';

import {
  QUALITY_OPTIONS,
  SECTION_SIZE_OPTIONS,
  followFrame,
  renderTier,
  watchTier,
} from './settings.ts';
import type { TierWatch } from './settings.ts';

/**
 * Runs frames at a fixed interval.
 *
 * @param watch The watch before the frames.
 * @param from The wall time of the first frame, in seconds.
 * @param intervalSec The time between two frames, in seconds.
 * @param count The number of frames.
 * @returns The watch after the frames.
 */
function run(watch: TierWatch, from: number, intervalSec: number, count: number): TierWatch {
  let next = watch;
  for (let i = 0; i < count; i++) {
    next = followFrame(next, from + i * intervalSec, true);
  }
  return next;
}

describe('the setting texts (design 2.8)', () => {
  it('holds the buttons of the section size and of the quality', () => {
    expect(SECTION_SIZE_OPTIONS.map((option) => option.label)).toEqual([
      'Auto',
      'One per part',
      'Full',
    ]);
    expect(QUALITY_OPTIONS.map((option) => option.label)).toEqual([
      'Auto',
      'High',
      'Medium',
      'Low',
    ]);
  });
});

describe('followFrame (design 2.6)', () => {
  it('keeps the tier while the frames take 16.7 ms', () => {
    expect(run(watchTier('high'), 0, 1 / 60, 600).tier).toBe('high');
  });

  it('drops one tier after 2 s of frames of 20 ms, and the next tier after 2 s more', () => {
    expect(run(watchTier('high'), 0, 0.02, 99).tier).toBe('high');
    expect(run(watchTier('high'), 0, 0.02, 101).tier).toBe('medium');
    expect(run(watchTier('high'), 0, 0.02, 202).tier).toBe('low');
    expect(run(watchTier('high'), 0, 0.02, 1000).tier).toBe('low');
  });

  it('reads the mean of the window, so that one slow frame does not drop the tier', () => {
    let watch = run(watchTier('high'), 0, 1 / 60, 60);
    watch = followFrame(watch, 1 + 0.1, true);
    watch = run(watch, 1.1 + 1 / 60, 1 / 60, 120);
    expect(watch.tier).toBe('high');
  });

  it('does not measure a pause or a hidden tab', () => {
    let watch = run(watchTier('high'), 0, 1 / 60, 60);
    watch = followFrame(watch, 1.5, false);
    // The first frame after the pause starts a new window, so the gap does not count.
    watch = run(watch, 30, 1 / 60, 200);
    expect(watch.tier).toBe('high');
  });

  it('never raises the tier', () => {
    expect(run(watchTier('low'), 0, 0.001, 5000).tier).toBe('low');
  });
});

describe('renderTier (design 2.6)', () => {
  it('uses the automatic tier for "Auto", else the tier of the user', () => {
    const watch = watchTier('medium');
    expect(renderTier('auto', watch)).toBe('medium');
    expect(renderTier('high', watch)).toBe('high');
    expect(renderTier('low', watch)).toBe('low');
  });
});

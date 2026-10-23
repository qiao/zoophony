import { describe, expect, it } from 'vitest';

import { motionEvent, movesCamera, nextMode } from './camera-mode.ts';

describe('the camera mode (design 2.5)', () => {
  it('changes to Free mode on a drag, a wheel, or a pinch', () => {
    for (const event of ['drag', 'wheel', 'pinch'] as const) {
      expect(nextMode('cinematic', event)).toBe('free');
      expect(nextMode('free', event)).toBe('free');
    }
  });

  it('ignores a wheel and a pinch on the first screen, and keeps a drag (bug of 2026-10-07)', () => {
    expect(movesCamera('wheel', true)).toBe(false);
    expect(movesCamera('pinch', true)).toBe(false);
    expect(movesCamera('drag', true)).toBe(true);
    for (const event of ['drag', 'wheel', 'pinch', 'click', 'toggle', 'reset'] as const) {
      expect(movesCamera(event, false)).toBe(true);
    }
  });

  it('keeps the mode on a click of 4 px or less, and on a new piece', () => {
    for (const mode of ['cinematic', 'free'] as const) {
      expect(nextMode(mode, 'click')).toBe(mode);
      expect(nextMode(mode, 'new-piece')).toBe(mode);
    }
  });

  it('switches the mode with the toggle, and gives Free mode on "Reset view"', () => {
    expect(nextMode('cinematic', 'toggle')).toBe('free');
    expect(nextMode('free', 'toggle')).toBe('cinematic');
    expect(nextMode('cinematic', 'reset')).toBe('free');
    expect(nextMode('free', 'reset')).toBe('free');
  });
});

describe('motionEvent (design 2.3, 2.5)', () => {
  it('gives a drag after a motion of more than 4 px, and a pinch with two pointers', () => {
    const down = { x: 100, y: 100 };
    expect(motionEvent(down, { x: 103, y: 102 }, 1)).toBeNull();
    expect(motionEvent(down, { x: 104, y: 100 }, 1)).toBeNull();
    expect(motionEvent(down, { x: 104, y: 101 }, 1)).toBe('drag');
    expect(motionEvent(down, { x: 110, y: 100 }, 2)).toBe('pinch');
  });
});

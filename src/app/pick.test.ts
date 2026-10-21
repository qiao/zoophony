import { describe, expect, it } from 'vitest';

import { CLICK_SLOP_PX, isClick } from './pick.ts';

describe('isClick (design 2.3)', () => {
  it('reads a short pointer motion as a click, and a longer one as a drag of the view', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(true);
    expect(isClick({ x: 10, y: 10 }, { x: 10 + CLICK_SLOP_PX, y: 10 })).toBe(true);
    expect(isClick({ x: 10, y: 10 }, { x: 14, y: 14 })).toBe(false);
  });
});

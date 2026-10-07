import { describe, expect, it } from 'vitest';

import { stageCover } from './stage-cover.ts';

const CLOSED = { phone: false, drawerOpen: false, drawerMovesStage: false, height: 900 } as const;

describe('stageCover (design 2.8)', () => {
  it('covers nothing while the drawer is closed', () => {
    expect(stageCover(CLOSED)).toEqual({ right: 0, lift: 0 });
    expect(stageCover({ ...CLOSED, phone: true })).toEqual({ right: 0, lift: 0 });
  });

  it('covers 352 px at the right with the open drawer of a wider screen', () => {
    const open = { ...CLOSED, drawerOpen: true, drawerMovesStage: true };
    expect(stageCover(open)).toEqual({ right: 352, lift: 0 });
  });

  it('keeps the frame in place beside a drawer that a click on an animal opened', () => {
    expect(stageCover({ ...CLOSED, drawerOpen: true })).toEqual({ right: 0, lift: 0 });
  });

  it('moves the frame up above the sheet of a phone, also after a click on an animal', () => {
    const sheet = { phone: true, drawerOpen: true, drawerMovesStage: false, height: 844 };
    expect(stageCover(sheet).right).toBe(0);
    expect(stageCover(sheet).lift).toBeCloseTo(0.3 * 844 - 20, 9);
  });
});

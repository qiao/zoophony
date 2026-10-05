import { describe, expect, it } from 'vitest';

import { scoreOf } from '../score/test-score.ts';
import { note, programChange, track } from '../midi/test-smf.ts';
import { castScore } from '../models/cast.ts';
import { CLICK_SLOP_PX, isClick, seatOfPlayer } from './pick.ts';

describe('isClick (design 2.3)', () => {
  it('reads a short pointer motion as a click, and a longer one as a drag of the view', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(true);
    expect(isClick({ x: 10, y: 10 }, { x: 10 + CLICK_SLOP_PX, y: 10 })).toBe(true);
    expect(isClick({ x: 10, y: 10 }, { x: 14, y: 14 })).toBe(false);
  });
});

describe('seatOfPlayer (design 2.3)', () => {
  it('gives the seat of each player, and no seat to the conductor after the players', () => {
    const score = scoreOf({
      tracks: [
        track([programChange(0, 0, 73)], note(0, 0, 76)),
        track([programChange(0, 1, 68)], note(0, 1, 72)),
      ],
    });
    const players = castScore(score);
    expect(players.map((_, i) => seatOfPlayer(players, i))).toEqual([0, 1]);
    expect(seatOfPlayer(players, players.length)).toBeNull();
  });
});

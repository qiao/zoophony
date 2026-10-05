import { describe, expect, it } from 'vitest';

import { drumPart } from './drum-map.ts';
import type { DrumPart } from './drum-map.ts';

/** Gives the player of each key of a kit, as `{ key: part }`, for the keys 33 to 82. */
function parts(kit: number): Map<number, DrumPart> {
  return new Map(Array.from({ length: 50 }, (_, i) => [33 + i, drumPart(kit, 33 + i)]));
}

/** Lists the keys of one player. */
function keysOf(map: Map<number, DrumPart>, part: DrumPart): number[] {
  return [...map].filter(([, value]) => value === part).map(([key]) => key);
}

describe('drumPart', () => {
  it('uses the map of the Orchestra kit 48 (design 3.6)', () => {
    const map = parts(48);

    expect(keysOf(map, 'timpani')).toEqual([41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]);
    expect(keysOf(map, 'bass-drum')).toEqual([35, 36]);
    expect(keysOf(map, 'snare-drum')).toEqual([38, 40]);
    expect(keysOf(map, 'cymbals')).toEqual([57, 59]);
    expect(keysOf(map, 'small-percussion')).toEqual([
      33,
      34,
      37,
      39,
      54,
      55,
      56,
      58,
      ...Array.from({ length: 23 }, (_, i) => 60 + i),
    ]);
  });

  it.each([0, 1, 8, 16, 25, 40, 127])('uses the GM1 map for kit %i (design 3.6)', (kit) => {
    const map = parts(kit);

    expect(keysOf(map, 'timpani')).toEqual([41, 43, 45, 47, 48, 50]);
    expect(keysOf(map, 'bass-drum')).toEqual([35, 36]);
    expect(keysOf(map, 'snare-drum')).toEqual([37, 38, 40]);
    expect(keysOf(map, 'cymbals')).toEqual([42, 44, 46, 49, 51, 52, 55, 57, 59]);
    expect(drumPart(kit, 80)).toBe('small-percussion');
    expect(drumPart(kit, 81)).toBe('small-percussion');
    expect(drumPart(kit, 54)).toBe('small-percussion');
    expect(drumPart(kit, 39)).toBe('small-percussion');
  });
});

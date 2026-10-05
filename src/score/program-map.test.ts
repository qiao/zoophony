import { describe, expect, it } from 'vitest';

import { programPlace, sectionByPitch, sustainsAfterSeek, techniqueOf } from './program-map.ts';
import type { SectionId } from './types.ts';

/** Expands the program list of a row of the table of design 3.5. */
function programs(...items: readonly (number | readonly [number, number])[]): number[] {
  return items.flatMap((item) => {
    if (Array.isArray(item)) {
      const [first, last] = item;
      return Array.from({ length: last - first + 1 }, (_, i) => first + i);
    }
    return [item];
  });
}

const ROWS: readonly (readonly [number[], SectionId])[] = [
  [programs([0, 7], 8, [16, 23]), 'piano'],
  [programs([9, 15], [112, 119]), 'percussion'],
  [programs([24, 31], 46, [104, 108]), 'harp'],
  [programs([32, 39], 43), 'contrabass'],
  [programs(40, 110), 'violin'],
  [programs(41), 'viola'],
  [programs(42), 'cello'],
  [programs(47), 'timpani'],
  [programs([52, 54]), 'choir'],
  [programs(56, 59), 'trumpet'],
  [programs(57), 'trombone'],
  [programs(58), 'tuba'],
  [programs(60), 'horn'],
  [programs([64, 67], 71), 'clarinet'],
  [programs(68, 69, 109, 111), 'oboe'],
  [programs(70), 'bassoon'],
  [programs([72, 79]), 'flute'],
  [programs(55, [80, 87], [96, 103], [120, 127]), 'sound-only'],
];

describe('programPlace', () => {
  it.each(ROWS)('maps the programs %j to the section %s (design 3.5)', (list, section) => {
    for (const program of list) {
      expect(programPlace(program)).toEqual({ kind: 'section', section });
    }
  });

  it('divides the string ensembles and the brass sections by pitch', () => {
    for (const program of programs([48, 51], [88, 95])) {
      expect(programPlace(program)).toEqual({ kind: 'divided', bands: 'strings' });
    }
    for (const program of programs([61, 63])) {
      expect(programPlace(program)).toEqual({ kind: 'divided', bands: 'brass' });
    }
  });

  it('gives the programs 44 and 45 the section of their channel', () => {
    expect(programPlace(44)).toEqual({ kind: 'channel' });
    expect(programPlace(45)).toEqual({ kind: 'channel' });
  });

  it('covers each of the 128 programs with exactly one row of the table', () => {
    const listed = [
      ...ROWS.flatMap(([list]) => list),
      ...programs([44, 45], [48, 51], [61, 63], [88, 95]),
    ];

    expect(listed.toSorted((a, b) => a - b)).toEqual(programs([0, 127]));
  });
});

describe('sectionByPitch', () => {
  it('uses the string bands: contrabass up to 35, cello from 36, viola from 48, violin from 55', () => {
    const keys = [0, 35, 36, 47, 48, 54, 55, 127];

    expect(keys.map((key) => sectionByPitch('strings', key))).toEqual([
      'contrabass',
      'contrabass',
      'cello',
      'cello',
      'viola',
      'viola',
      'violin',
      'violin',
    ]);
  });

  it('uses the brass bands: tuba up to 39, trombone from 40, horn from 53, trumpet from 65', () => {
    const keys = [0, 39, 40, 52, 53, 64, 65, 127];

    expect(keys.map((key) => sectionByPitch('brass', key))).toEqual([
      'tuba',
      'tuba',
      'trombone',
      'trombone',
      'horn',
      'horn',
      'trumpet',
      'trumpet',
    ]);
  });
});

describe('techniqueOf', () => {
  it('gives tremolo to 44 and pizzicato to 45 and the basses 32 to 39 (design 3.5)', () => {
    expect(techniqueOf(44)).toBe('tremolo');
    for (const program of programs(45, [32, 39])) {
      expect(techniqueOf(program)).toBe('pizzicato');
    }
  });

  it('gives normal to all other programs', () => {
    const others = programs([0, 127]).filter((program) => program !== 44 && program !== 45);

    expect(others.filter((program) => program < 32 || program > 39).map(techniqueOf)).toEqual(
      Array.from({ length: 128 - 2 - 8 }, () => 'normal'),
    );
  });
});

describe('sustainsAfterSeek', () => {
  it('gives a long sound to bowed strings, choir, brass, reeds, pipes, organs, and synths', () => {
    for (const value of [16, 40, 44, 48, 52, 56, 60, 68, 73, 79, 80, 88, 95, 109, 110, 111]) {
      expect(sustainsAfterSeek(value)).toBe(true);
    }
  });

  it('gives a decaying sound to piano, pizzicato, harp, timpani, and mallets', () => {
    for (const value of [0, 8, 13, 45, 46, 47, 55, 96, 104, 108, 112, 127]) {
      expect(sustainsAfterSeek(value)).toBe(false);
    }
  });

  it('gives a long sound to exactly the GM programs of design 6.5', () => {
    const all = Array.from({ length: 128 }, (_, i) => i);

    expect(all.filter(sustainsAfterSeek)).toEqual(
      programs([16, 23], [40, 44], [48, 54], [56, 95], [109, 111]),
    );
  });
});

import { describe, expect, it } from 'vitest';

import { chord, note, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { SECTION_SPECIES, castScore, speciesOf } from './cast.ts';
import { SPECIES } from './species.ts';
import type { PlayerCast } from './cast.ts';

/** Gives the instruments of the cast of one seat. */
function instrumentsOf(cast: readonly PlayerCast[], seatIndex: number): string[] {
  return cast.filter((p) => p.seatIndex === seatIndex).map((p) => p.instrument);
}

describe('castScore', () => {
  it('alternates the rabbits and the red foxes of the violin seats (design 4.3)', () => {
    const violins = [0, 1, 2].map((channel) =>
      track([programChange(0, channel, 40)], note(0, channel, 72)),
    );
    const cast = castScore(scoreOf({ tracks: violins }, 'one-per-part'));
    expect(cast.map((p) => p.species)).toEqual(['rabbit', 'fox-red', 'rabbit']);
    expect(cast.map((p) => p.instrument)).toEqual(['violin', 'violin', 'violin']);
    expect(speciesOf('violin', 3)).toBe('fox-red');
    expect(speciesOf('choir', 2)).toBe('penguin');
  });

  it('gives each drum player the instrument of its key group (design 3.6, 3.8)', () => {
    // Keys 81 (triangle), 49 (crash cymbal), and 36 (bass drum) of the GM1 map.
    const drums = track(chord(0, 9, [81, 49, 36]));
    const cast = castScore(scoreOf({ tracks: [drums] }));
    expect(cast.map((p) => p.instrument)).toEqual(['bass-drum', 'cymbals', 'small-percussion']);
    expect(cast.every((p) => p.species === 'badger')).toBe(true);
  });

  it('gives a melodic percussion seat the xylophone (design 4.6)', () => {
    const mallets = track([programChange(0, 0, 13)], note(0, 0, 84));
    expect(instrumentsOf(castScore(scoreOf({ tracks: [mallets] })), 0)).toEqual(['xylophone']);
  });

  it('counts the kettles from the highest timpani note (design 4.6)', () => {
    const timpani = (top: number): PlayerCast | undefined =>
      castScore(
        scoreOf({ tracks: [track([programChange(0, 0, 47)], note(0, 0, 43), note(480, 0, top))] }),
      )[0];
    expect(timpani(48)?.kettles).toBe(2);
    expect(timpani(50)?.kettles).toBe(3);
    expect(timpani(55)?.kettles).toBe(4);
    expect(timpani(55)?.species).toBe('elephant');
  });

  it('gives no player to the sound-only seat', () => {
    const lead = track([programChange(0, 0, 81)], note(0, 0, 72));
    const flute = track([programChange(0, 1, 73)], note(0, 1, 72));
    const score = scoreOf({ tracks: [flute, lead] });
    expect(score.seats.map((s) => s.section)).toEqual(['flute', 'sound-only']);
    expect(castScore(score)).toEqual([
      { seatIndex: 0, player: 0, species: 'fox-tan', instrument: 'flute', kettles: 4 },
    ]);
  });

  it('casts each player of the six demos in the order of the seats', async () => {
    for (const demo of await patchedDemos()) {
      for (const size of ['auto', 'one-per-part', 'full'] as const) {
        const score = scoreOf(demo.bytes, size);
        const cast = castScore(score);
        const expected = score.seats.flatMap((seat, seatIndex) =>
          Array.from({ length: seat.playerCount }, (_, player) => [seatIndex, player]),
        );
        expect(
          cast.map((p) => [p.seatIndex, p.player]),
          demo.file,
        ).toEqual(expected);
      }
    }
  });
});

describe('SECTION_SPECIES', () => {
  it('puts the large species in the back rows and the small species in front (design 4.3)', () => {
    // The user asked on 2026-10-05 that big animals sit at the back, so that they hide no
    // smaller animal.
    const front = ['violin', 'viola', 'piano', 'flute', 'oboe', 'clarinet', 'bassoon'] as const;
    for (const section of front) {
      for (const species of SECTION_SPECIES[section]) {
        expect(SPECIES[species].size, `${section}: ${species}`).toBeLessThanOrEqual(1);
      }
    }
    const back = new Set<string>(['timpani', 'contrabass', 'tuba']);
    for (const [section, list] of Object.entries(SECTION_SPECIES)) {
      for (const species of list) {
        if (SPECIES[species].size >= 1.3) {
          expect(back.has(section), `${section}: ${species}`).toBe(true);
        }
      }
    }
    // The cello needs a species of at least 1.2, so that the arm reaches the full bow hair.
    expect(SPECIES[SECTION_SPECIES.cello[0]].size).toBeGreaterThanOrEqual(1.2);
  });
});

import { describe, expect, it } from 'vitest';

import { chord, note, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { patchedDemos } from '../../tools/patch-demos.ts';
import { CHAMBER_PLAYERS, castScore, chamberFormOf, speciesOf } from './cast.ts';
import { INSTRUMENT_SUPPORTS } from './player.ts';
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

  it('gives no player to the sound-only seat, and lets a flute alone stand', () => {
    const lead = track([programChange(0, 0, 81)], note(0, 0, 72));
    const flute = track([programChange(0, 1, 73)], note(0, 1, 72));
    const score = scoreOf({ tracks: [flute, lead] });
    expect(score.seats.map((s) => s.section)).toEqual(['flute', 'sound-only']);
    expect(castScore(score)).toEqual([
      {
        seatIndex: 0,
        player: 0,
        species: 'fox-tan',
        instrument: 'flute',
        kettles: 4,
        support: 'stand',
      },
    ]);
  });

  it('casts each player of the demos in the order of the seats', async () => {
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

  it('lets the soloist of a wind stand, and seats each other player (design 4.5)', async () => {
    const demos = await patchedDemos();
    const k315 = demos.find((d) => d.file === 'mozart-k315.mid');
    const score = scoreOf(k315?.bytes ?? new Uint8Array());
    for (const p of castScore(score)) {
      const soloist = p.seatIndex === score.soloist;
      expect(soloist, p.instrument).toBe(p.instrument === 'flute');
      expect(p.support, p.instrument).toBe(soloist ? 'stand' : INSTRUMENT_SUPPORTS[p.instrument]);
    }
    // The piano soloist keeps its bench.
    const bach = demos.find((d) => d.file === 'bach-bwv1048.mid');
    const piano = castScore(scoreOf(bach?.bytes ?? new Uint8Array())).find(
      (p) => p.instrument === 'piano',
    );
    expect(piano?.support).toBe('bench');
  });
});

describe('chamberFormOf (design 4.2)', () => {
  /** Makes a score of one seat for each program, with one note each. */
  const scoreOfPrograms = (...programs: readonly number[]) =>
    scoreOf({
      tracks: programs.map((program, channel) =>
        track([programChange(0, channel, program)], note(0, channel, 60 + channel)),
      ),
    });

  it('finds a player alone, a pianist with a partner, and an arc of up to 5 players', () => {
    expect(CHAMBER_PLAYERS).toBe(5);
    expect(chamberFormOf(scoreOfPrograms(0).seats)).toBe('solo');
    expect(chamberFormOf(scoreOfPrograms(40, 0).seats)).toBe('recital');
    expect(chamberFormOf(scoreOfPrograms(40, 42).seats)).toBe('arc');
    expect(chamberFormOf(scoreOfPrograms(40, 42, 0).seats)).toBe('arc');
    expect(chamberFormOf(scoreOfPrograms(73, 68, 71, 70, 60).seats)).toBe('arc');
    expect(chamberFormOf(scoreOfPrograms(73, 68, 71, 70, 60, 72).seats)).toBeNull();
    expect(chamberFormOf([])).toBeNull();
  });

  it('lets a player alone and the partner of a pianist stand, and seats an arc', () => {
    const supports = (...programs: readonly number[]) =>
      castScore(scoreOfPrograms(...programs)).map((p) => `${p.instrument} ${p.support}`);
    expect(supports(40)).toEqual(['violin stand']);
    expect(supports(42)).toEqual(['cello chair']);
    expect(supports(73, 0)).toEqual(['piano bench', 'flute stand']);
    expect(supports(73, 68)).toEqual(['flute chair', 'oboe chair']);
  });
});

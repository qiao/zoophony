import { describe, expect, it } from 'vitest';

import { chord, note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import { noteOn, noteOff } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { barLengthAt, beatLengthAt, entriesNear, musicIn, prepareMusic } from './music.ts';

/** At 120 BPM in 4/4, a quarter note is 0.5 s and a bar is 2 s. */
const QUARTER = 480;

describe('musicIn (design 5.6)', () => {
  it('gives a seat with one note of half the window a coverage of 0.5', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 40)], note(0, 0, 60, QUARTER * 8)),
        track([programChange(0, 1, 73)], note(0, 1, 72, QUARTER * 16)),
      ],
    });
    const music = prepareMusic(score);
    const window = musicIn(music, 0, 8);
    const violin = score.seats.findIndex((s) => s.section === 'violin');
    const flute = score.seats.findIndex((s) => s.section === 'flute');
    expect(window.coverage[violin]).toBeCloseTo(0.5, 9);
    expect(window.coverage[flute]).toBeCloseTo(1, 9);
    expect(musicIn(music, 4, 8).coverage[violin]).toBeCloseTo(0, 9);
  });

  it('merges the spans of notes that overlap', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120)],
        track(
          [programChange(0, 0, 40)],
          note(0, 0, 60, QUARTER * 4),
          note(QUARTER * 2, 0, 64, QUARTER * 6),
        ),
      ],
    });
    // The two notes cover 0 to 3 s together, not 2 s + 2 s.
    expect(musicIn(prepareMusic(score), 0, 6).coverage[0]).toBeCloseTo(0.5, 9);
  });

  it('reads the loudest note that sounds in the window, also a note that started before it', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120)],
        track(
          [programChange(0, 0, 40)],
          [noteOn(0, 0, 60, 127), noteOff(QUARTER * 16, 0, 60)],
          [noteOn(QUARTER * 2, 0, 64, 40), noteOff(QUARTER * 3, 0, 64)],
        ),
      ],
    });
    const music = prepareMusic(score);
    expect(musicIn(music, 4, 6).loudness[0]).toBeCloseTo((127 / 127) * (100 / 127), 6);
    expect(musicIn(music, 9, 10).loudness[0]).toBe(0);
  });

  it('finds a tutti: most seats active and loud', () => {
    const channels = [0, 1, 2, 3];
    const programs = [40, 41, 42, 73];
    const loud = scoreOf({
      tracks: [
        [tempo(0, 120)],
        ...channels.map((c) =>
          track(
            [programChange(0, c, programs[c] ?? 0)],
            [noteOn(0, c, 60 + c, 127), noteOff(QUARTER * 16, c, 60 + c)],
          ),
        ),
      ],
    });
    const window = musicIn(prepareMusic(loud), 0, 8);
    expect(window.activeCount).toBe(4);
    expect(window.tutti).toBe(true);
    const soft = scoreOf({
      tracks: [
        [tempo(0, 120)],
        ...channels.map((c) =>
          track(
            [programChange(0, c, programs[c] ?? 0)],
            [noteOn(0, c, 60 + c, 50), noteOff(QUARTER * 16, c, 60 + c)],
          ),
        ),
      ],
    });
    expect(musicIn(prepareMusic(soft), 0, 8).tutti).toBe(false);
  });
});

describe('the lead of musicIn (design 5.6, UX audit 2026-10-05, SC4)', () => {
  /**
   * Makes a held note with a velocity.
   *
   * @param channel The channel.
   * @param key The key.
   * @param velocity The velocity.
   * @returns The note on at 0 and the note off after 4 bars.
   */
  const held = (channel: number, key: number, velocity: number) => [
    noteOn(0, channel, key, velocity),
    noteOff(QUARTER * 16, channel, key),
  ];

  it('gives the lead to the seat with the top line', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 40)], held(0, 60, 100)),
        track([programChange(0, 1, 73)], held(1, 72, 100)),
        track([programChange(0, 2, 42)], held(2, 48, 100)),
      ],
    });
    const lead = musicIn(prepareMusic(score), 0, 8).lead;
    const seat = (section: string): number => score.seats.findIndex((s) => s.section === section);
    expect(lead[seat('flute')]).toBe(true);
    expect(lead[seat('violin')]).toBe(false);
    expect(lead[seat('cello')]).toBe(false);
  });

  it('gives the lead to one loud seat over a quiet accompaniment', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 40)], held(0, 72, 40)),
        track([programChange(0, 1, 41)], held(1, 60, 40)),
        track([programChange(0, 2, 42)], held(2, 48, 120)),
      ],
    });
    const lead = musicIn(prepareMusic(score), 0, 8).lead;
    const seat = (section: string): number => score.seats.findIndex((s) => s.section === section);
    expect(lead[seat('cello')]).toBe(true);
    expect(lead[seat('violin')]).toBe(true);
    expect(lead[seat('viola')]).toBe(false);
  });

  it('gives no lead to the percussion, which plays no melody', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 40)], held(0, 60, 100)),
        track(held(9, 81, 100)),
      ],
    });
    const lead = musicIn(prepareMusic(score), 0, 8).lead;
    expect(lead[score.seats.findIndex((s) => s.section === 'percussion')]).toBe(false);
    expect(lead[score.seats.findIndex((s) => s.section === 'violin')]).toBe(true);
  });

  /**
   * Makes a file of a choir of four voices under a flute and the violins: an orchestral file,
   * so the choir has 8 singers that divide each chord (design 3.8).
   *
   * @param flute The key of the flute.
   * @returns The score.
   */
  const choirUnder = (flute: number) =>
    scoreOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 73)], held(0, flute, 100)),
        track([programChange(0, 1, 40)], held(1, 57, 100)),
        track([programChange(0, 2, 52)], chord(0, 2, [74, 69, 62, 50], QUARTER * 16)),
      ],
    });

  it('finds the tune of a choir under the same tune an octave higher', () => {
    // The flutes double the sopranos of the Ode to Joy an octave higher, so the top line alone
    // gave the choir 0% to 34% of each window.
    const score = choirUnder(86);
    const window = musicIn(prepareMusic(score), 0, 8);
    const choir = score.seats.findIndex((s) => s.section === 'choir');
    expect(score.seats[choir]?.playerCount).toBe(8);
    expect(window.tune[choir]).toBe(true);
    expect(window.lead[choir]).toBe(true);
    // The top voice of a chord of four keys has the first two of the 8 singers.
    expect(window.tunePlayers[choir]).toEqual([0, 1]);
    expect(window.tune[score.seats.findIndex((s) => s.section === 'flute')]).toBe(false);
  });

  it('finds no tune of a choir that sings another line than the top line', () => {
    const score = choirUnder(81);
    const window = musicIn(prepareMusic(score), 0, 8);
    const choir = score.seats.findIndex((s) => s.section === 'choir');
    expect(window.tune[choir]).toBe(false);
    expect(window.lead[choir]).toBe(false);
    expect(window.tunePlayers[choir]).toBeNull();
  });
});

describe('entriesNear (design 5.4, 5.6)', () => {
  it('finds the entry of a seat after two bars of rest, near a time', () => {
    const score = scoreOf({
      tracks: [
        [tempo(0, 120), timeSignature(0, 4, 4)],
        track([programChange(0, 0, 40)], note(0, 0, 60, QUARTER * 40)),
        track([programChange(0, 1, 73)], note(0, 1, 72), note(QUARTER * 16, 1, 72)),
      ],
    });
    const music = prepareMusic(score);
    const flute = score.seats.findIndex((s) => s.section === 'flute');
    expect(entriesNear(music, 8, 0.5)).toEqual([flute]);
    expect(entriesNear(music, 9, 0.5)).toEqual([]);
    expect(barLengthAt(music, 8)).toBeCloseTo(2, 9);
    expect(beatLengthAt(music, 8)).toBeCloseTo(0.5, 9);
  });
});

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { PlayerScore } from '../audio/player.ts';

import {
  noteOff,
  noteOn,
  port,
  programChange,
  tempo,
  timeSignature,
  trackName,
  writeSmf,
} from '../midi/test-smf.ts';
import type { TestEvent, TestFile } from '../midi/test-smf.ts';
import { buildScore } from './score.ts';
import { buildTimeline } from './timeline.ts';
import type { Score, SectionSize } from './types.ts';

function score(file: TestFile, sectionSize: SectionSize = 'auto'): Score {
  const result = buildScore(writeSmf(file), sectionSize);
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return result.score;
}

/** Makes one note from `tick` to `end` on a channel. */
function note(tick: number, end: number, channel: number, pitch: number): TestEvent[] {
  return [noteOn(tick, channel, pitch), noteOff(end, channel, pitch)];
}

describe('buildScore', () => {
  it('builds all fields of the score of a file (design 3.2)', () => {
    const result = score({
      tracks: [
        [trackName('Allegro'), tempo(0, 120), timeSignature(0, 3, 4)],
        [programChange(0, 0, 73), ...note(0, 960, 0, 72), ...note(960, 1440, 0, 74)],
        [programChange(0, 1, 40), ...note(480, 2400, 1, 67)],
      ],
    });

    expect(result.durationSec).toBe(2.5);
    expect(result.sequenceName).toBe('Allegro');
    expect(result.orchestral).toBe(true);
    expect(result.seats.map((seat) => `${seat.section} ${seat.playerCount}`)).toEqual([
      'violin 4',
      'flute 1',
    ]);
    expect(result.notes.map((item) => [item.seatIndex, item.player, item.startSec])).toEqual([
      [1, 0, 0],
      [0, 0, 0.5],
      [0, 1, 0.5],
      [0, 2, 0.5],
      [0, 3, 0.5],
      [1, 0, 1],
    ]);
    expect(result.beats.map((beat) => beat.timeSec)).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(result.synthEvents.map((event) => event.seatIndex)).toEqual([-1, 1, -1, 0, 1, 1, 1, 0]);
    expect(result.presets).toEqual([
      { bank: 0, program: 73, drumKit: false },
      { bank: 0, program: 40, drumKit: false },
    ]);
  });

  it('builds a score that the audio player loads (design 6.8)', () => {
    // tsc checks this line: `Player.load()` takes a `PlayerScore`.
    expectTypeOf<Score>().toExtend<PlayerScore>();
  });

  it('gives an empty sequence name to a file with no name event', () => {
    expect(score({ tracks: [note(0, 480, 0, 60)] }).sequenceName).toBe('');
  });

  it.each([
    'control track',
    'Control Track',
    'Conductor',
    'UNTITLED',
    'Sequence',
    'Track 12',
    'track3',
    '1 2 3',
    '---',
  ])('gives an empty sequence name for the name "%s" (design 8.2)', (name) => {
    const file: TestFile = { tracks: [[trackName(name)], note(0, 480, 0, 60)] };

    expect(score(file).sequenceName).toBe('');
  });

  it.each(['Allegro', 'Track of the night', 'Sinfonía 2', 'Conductor march', 'Ésquisse'])(
    'keeps the sequence name "%s" (design 8.2)',
    (name) => {
      const file: TestFile = { tracks: [[trackName(name)], note(0, 480, 0, 60)] };

      expect(score(file).sequenceName).toBe(name);
    },
  );

  it.each<readonly [string, Uint8Array, string]>([
    ['a file that is not MIDI', new TextEncoder().encode('RIFF data'), 'not-midi'],
    ['a file with no notes', writeSmf({ tracks: [[programChange(0, 0, 40)]] }), 'no-notes'],
  ])('refuses %s with its file error (design 3.3)', (_name, bytes, error) => {
    expect(buildScore(bytes, 'auto')).toEqual({ ok: false, error });
  });

  it('keeps the synth events when the seats above 60 move to the sound-only seat (design 3.7)', () => {
    // 75 violin seats on 5 ports, one track for each channel. Only the 15 seats of port 0 have
    // one note, so they move.
    const melodic = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
    const file: TestFile = {
      tracks: [
        [],
        ...Array.from({ length: 75 }, (_, i) => {
          const channel = melodic[i % 15] ?? 0;
          const notes = note(0, 480, channel, 70);
          if (i >= 15) {
            notes.push(...note(480, 960, channel, 72));
          }
          return [port(Math.floor(i / 15)), programChange(0, channel, 40), ...notes];
        }),
      ],
    };
    const timeline = buildTimeline(writeSmf(file));
    if (!timeline.ok) {
      throw new Error('The test file was refused.');
    }
    const sounds = timeline.timeline.events.map((event) => [
      event.timeSec,
      event.synthChannel,
      event.kind,
      event.data1,
      event.data2,
    ]);

    for (const size of ['auto', 'one-per-part', 'full'] as const) {
      const result = score(file, size);
      const moved = result.synthEvents.filter((event) => event.channel < 16 && event.kind !== 0xc0);

      expect(result.seats.filter((seat) => seat.playerCount > 0)).toHaveLength(60);
      expect(result.seats.reduce((sum, seat) => sum + seat.playerCount, 0)).toBe(60);
      expect(
        result.synthEvents.map((event) => [
          event.timeSec,
          event.channel,
          event.kind,
          event.data1,
          event.data2,
        ]),
      ).toEqual(sounds);
      expect(moved.map((event) => event.seatIndex)).toEqual(moved.map(() => 60));
    }
  });
});

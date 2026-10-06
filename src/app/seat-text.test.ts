import { describe, expect, it } from 'vitest';

import { patchedDemos } from '../../tools/patch-demos.ts';
import { note, port, programChange, track } from '../midi/test-smf.ts';
import { scoreOf } from '../score/test-score.ts';
import { keyboardName, listText, seatNames, seatRows, sourceLine } from './seat-text.ts';

describe('listText (design 2.8)', () => {
  it('joins two items with "and", and three or more with commas and "and"', () => {
    expect(listText(['4'])).toBe('4');
    expect(listText(['4', '5'])).toBe('4 and 5');
    expect(listText(['1', '2', '9'])).toBe('1, 2, and 9');
  });
});

describe('seatNames (design 2.8)', () => {
  it('numbers the seats of a section with more than one seat, from 1', () => {
    const score = scoreOf({
      tracks: [
        track([programChange(0, 0, 40)], note(0, 0, 76)),
        track([programChange(0, 1, 40)], note(0, 1, 72)),
        track([programChange(0, 2, 41)], note(0, 2, 60)),
        track([programChange(0, 3, 80)], note(0, 3, 60)),
      ],
    });
    expect(seatNames(score.seats)).toEqual(['Violins 1', 'Violins 2', 'Violas', 'Other sounds']);
  });
});

describe('the names of the keyboard seats (audit 2026-10-05-ux-design, DR2)', () => {
  it('names a seat of the section "piano" after its first program', () => {
    expect([0, 5, 6, 7, 8, 16, 19, 21, 22, 23].map(keyboardName)).toEqual([
      'Piano',
      'Piano',
      'Harpsichord',
      'Clavinet',
      'Celesta',
      'Organ',
      'Organ',
      'Accordion',
      'Harmonica',
      'Accordion',
    ]);
  });

  it('gives the celesta of the Boulanger demo and the harpsichord of the Bach demo', async () => {
    const demos = await patchedDemos();
    const names = (file: string): string[] => {
      const demo = demos.find((d) => d.file === file);
      if (!demo) {
        throw new Error(`No demo ${file}.`);
      }
      return seatNames(scoreOf(demo.bytes).seats);
    };
    expect(names('boulanger-matin.mid')).toContain('Celesta');
    expect(names('bach-bwv1048.mid')).toContain('Harpsichord');
    expect(names('boulanger-matin.mid')).not.toContain('Piano');
  });

  it('takes the first program of a pianist who plays several keyboards', () => {
    // The pianist plays all piano channels (3.7).
    const score = scoreOf({
      tracks: [
        track([programChange(0, 0, 8)], note(0, 0, 76)),
        track([programChange(0, 1, 6)], note(480, 1, 72)),
      ],
    });
    expect(seatNames(score.seats)).toEqual(['Celesta']);
  });
});

describe('sourceLine (design 2.8)', () => {
  it('names one source with the channel from 1 and the port from 0', () => {
    const score = scoreOf({ tracks: [track([programChange(0, 7, 40)], note(0, 7, 76))] });
    expect(score.seats.map(sourceLine)).toEqual(['Port 0, channel 8, program 40']);
  });

  it('names the programs of a seat in the order of first use', () => {
    const score = scoreOf({
      tracks: [
        track(
          [programChange(0, 11, 45)],
          note(0, 11, 76),
          [programChange(480, 11, 40)],
          note(480, 11, 76),
        ),
      ],
    });
    expect(score.seats.map(sourceLine)).toEqual(['Port 0, channel 12, programs 45 and 40']);
  });

  it('names several channels of one port, with commas and "and" for three', () => {
    const score = scoreOf({
      tracks: [
        track(note(0, 0, 60)),
        track(note(0, 1, 64)),
        track(note(0, 8, 67)),
        track([programChange(0, 3, 40)], note(0, 3, 76), [programChange(0, 4, 40)], note(0, 4, 79)),
      ],
    });
    // The pianist plays all piano channels (3.7). One track with two violin channels forms one
    // seat (3.7, merge rule for articulation channels).
    expect(score.seats.map(sourceLine)).toEqual([
      'Port 0, channels 4 and 5, program 40',
      'Port 0, channels 1, 2, and 9, program 0',
    ]);
  });

  it('names the port of each source when a seat has several ports', () => {
    const score = scoreOf({
      tracks: [track([port(0)], note(0, 3, 60)), track([port(1)], note(0, 1, 64))],
    });
    expect(score.seats.map(sourceLine)).toEqual(['Port 0 channel 4, port 1 channel 2, program 0']);
  });

  it('names the kit of a rhythm channel, also next to the program of a melodic source', () => {
    const drums = scoreOf({ tracks: [track([programChange(0, 9, 48)], note(0, 9, 36))] });
    expect(drums.seats.map(sourceLine)).toEqual(['Port 0, channel 10, kit 48']);
    const timpani = scoreOf({
      tracks: [
        track([programChange(0, 6, 47)], note(0, 6, 45)),
        track([programChange(0, 9, 48)], note(480, 9, 41)),
      ],
    });
    expect(timpani.seats.map(sourceLine)).toEqual([
      'Port 0, channels 7 and 10, program 47, kit 48',
    ]);
  });

  it('names only the programs and the kits of the sound-only seat', () => {
    const score = scoreOf({
      tracks: [
        track(
          [programChange(0, 2, 80)],
          note(0, 2, 60),
          [programChange(480, 2, 81)],
          note(480, 2, 60),
        ),
      ],
    });
    expect(score.seats.map(sourceLine)).toEqual(['Programs 80 and 81']);
  });

  it('gives the rows of the default demo that the prototype shows', async () => {
    const demos = await patchedDemos();
    const boulanger = demos.find((demo) => demo.file === 'boulanger-matin.mid');
    if (!boulanger) {
      throw new Error('No Boulanger demo.');
    }
    const score = scoreOf(boulanger.bytes);
    const names = seatNames(score.seats);
    const rows = score.seats.map((seat, i) => `${names[i]}: ${sourceLine(seat)}`);
    expect(rows.slice(0, 5)).toEqual([
      'Violins 1: Port 0, channel 12, programs 40 and 45',
      'Violins 2: Port 0, channel 13, programs 40 and 45',
      'Violas: Port 0, channel 14, programs 41 and 45',
      'Cellos: Port 0, channel 15, programs 45 and 42',
      'Contrabasses: Port 0, channel 16, programs 43 and 32',
    ]);
    expect(rows.at(-1)).toBe('Percussion: Port 0, channel 10, kit 48');
  });
});

describe('seatRows (design 2.8)', () => {
  it('gives the dot the fur color of the species of the seat, and no color to other sounds', () => {
    const score = scoreOf({
      tracks: [
        track([programChange(0, 0, 40)], note(0, 0, 76)),
        track([programChange(0, 1, 40)], note(0, 1, 72)),
        track([programChange(0, 3, 80)], note(0, 3, 60)),
      ],
    });
    // The rabbit plays the first violins and the red fox the second violins (4.3).
    expect(seatRows(score.seats)).toEqual([
      { name: 'Violins 1', source: 'Port 0, channel 1, program 40', color: '#ece6dc' },
      { name: 'Violins 2', source: 'Port 0, channel 2, program 40', color: '#f0934c' },
      { name: 'Other sounds', source: 'Program 80', color: null },
    ]);
  });
});

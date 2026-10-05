import { describe, expect, it } from 'vitest';

import { controlChange, noteOff, noteOn, port, programChange, sysEx } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { assignSeats } from './seats.ts';
import { buildSynthEvents, listPresets } from './synth.ts';
import { timelineOf } from './test-score.ts';
import type { SynthEvent } from './types.ts';

function synthEvents(file: TestFile): SynthEvent[] {
  const result = timelineOf(file);
  return buildSynthEvents(result, assignSeats(result).noteSeats);
}

/** Writes each event as text: "time channel kind data1 data2 seat". */
function text(events: readonly SynthEvent[]): string[] {
  return events.map(
    (event) =>
      `${event.timeSec} ${event.channel} ${event.kind.toString(16)} ` +
      `${event.data1} ${event.data2} ${event.seatIndex}`,
  );
}

describe('buildSynthEvents', () => {
  it('gives each note event its seat, and -1 to the other events (design 3.2)', () => {
    const result = synthEvents({
      tracks: [
        [],
        [programChange(0, 0, 81), noteOn(0, 0, 60), noteOff(480, 0, 60)],
        [
          controlChange(0, 1, 7, 90),
          programChange(0, 1, 40),
          noteOn(0, 1, 70, 80),
          noteOn(480, 1, 72, 0),
          noteOff(960, 1, 70),
        ],
      ],
    });

    // Seat 0 is the violin seat, seat 1 the sound-only seat.
    expect(text(result)).toEqual([
      '0 0 c0 81 0 -1',
      '0 0 90 60 100 1',
      '0 1 b0 7 90 -1',
      '0 1 c0 40 0 -1',
      '0 1 90 70 80 0',
      '0.5 0 80 60 64 1',
      '1 1 80 70 64 0',
    ]);
  });

  it('removes SysEx and gives the synth channel of each port (design 3.3, 3.4)', () => {
    const result = synthEvents({
      tracks: [
        [port(3), sysEx(0, [0x41, 0x10, 0x42]), noteOn(0, 9, 36), noteOff(480, 9, 36)],
        [port(1), noteOn(0, 2, 60), noteOff(480, 2, 60)],
      ],
    });

    expect(text(result)).toEqual([
      '0 25 90 36 100 1',
      '0 2 90 60 100 0',
      '0.5 25 80 36 64 1',
      '0.5 2 80 60 64 0',
    ]);
  });
});

describe('listPresets', () => {
  it('lists the presets of the notes in the order of first use (design 3.2)', () => {
    const result = timelineOf({
      tracks: [
        [
          noteOn(0, 0, 60),
          controlChange(0, 1, 0, 8),
          programChange(0, 1, 40),
          programChange(0, 2, 41),
          programChange(0, 9, 48),
          noteOn(480, 9, 41),
          noteOn(480, 1, 70),
          controlChange(960, 1, 0, 0),
          programChange(960, 1, 40),
          noteOn(960, 1, 72),
          noteOn(1440, 3, 60),
        ],
      ],
    });

    expect(listPresets(result.notes)).toEqual([
      { bank: 0, program: 0, drumKit: false },
      { bank: 128, program: 48, drumKit: true },
      { bank: 8, program: 40, drumKit: false },
      { bank: 0, program: 40, drumKit: false },
    ]);
  });
});

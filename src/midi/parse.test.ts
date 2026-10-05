import { describe, expect, it } from 'vitest';

import { MAX_FILE_BYTES, parseMidi } from './parse.ts';
import {
  controlChange,
  endOfTrack,
  noteOff,
  noteOn,
  parseTestFile,
  port,
  programChange,
  sysEx,
  tempo,
  timeSignature,
  trackName,
  writeSmf,
} from './test-smf.ts';
import type { TestEvent } from './test-smf.ts';
import type { MidiError, MidiFile } from './types.ts';

function refusal(bytes: Uint8Array): MidiError | undefined {
  const result = parseMidi(bytes);
  return result.ok ? undefined : result.error;
}

/** Makes a file of one track from the bytes of its events, each with a delta time of 0. */
function rawTrack(...events: (readonly number[])[]): Uint8Array {
  const data = events.flatMap((event) => [0x00, ...event]);
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0];
  const length = [0, 0, data.length >> 8, data.length & 0xff];
  return Uint8Array.from([...header, 0x4d, 0x54, 0x72, 0x6b, ...length, ...data]);
}

const NOTE: readonly TestEvent[] = [noteOn(0, 0, 60), noteOff(480, 0, 60)];

describe('parseMidi', () => {
  it('reads the header and the channel events with their ticks', () => {
    const file = parseTestFile({
      ticksPerQuarter: 96,
      tracks: [
        [
          programChange(0, 3, 40),
          controlChange(10, 3, 7, 90),
          noteOn(10, 3, 67, 80),
          { tick: 20, bytes: [0xa3, 67, 30] },
          { tick: 30, bytes: [0xd3, 50] },
          { tick: 200, bytes: [0xe3, 0x00, 0x60] },
          noteOff(300, 3, 67),
        ],
      ],
    });

    expect(file.format).toBe(0);
    expect(file.ticksPerQuarter).toBe(96);
    expect(file.tracks).toHaveLength(1);
    expect(file.tracks[0]?.events).toEqual([
      { type: 'channel', tick: 0, kind: 0xc0, channel: 3, data1: 40, data2: 0, dataOffset: 24 },
      { type: 'channel', tick: 10, kind: 0xb0, channel: 3, data1: 7, data2: 90, dataOffset: 27 },
      { type: 'channel', tick: 10, kind: 0x90, channel: 3, data1: 67, data2: 80, dataOffset: 31 },
      { type: 'channel', tick: 20, kind: 0xa0, channel: 3, data1: 67, data2: 30, dataOffset: 35 },
      { type: 'channel', tick: 30, kind: 0xd0, channel: 3, data1: 50, data2: 0, dataOffset: 39 },
      { type: 'channel', tick: 200, kind: 0xe0, channel: 3, data1: 0, data2: 0x60, dataOffset: 43 },
      { type: 'channel', tick: 300, kind: 0x80, channel: 3, data1: 67, data2: 64, dataOffset: 47 },
    ]);
  });

  it('reads the tracks of a format 1 file in order', () => {
    const file = parseTestFile({ tracks: [[tempo(0, 100)], NOTE, [noteOn(0, 5, 40)]] });

    expect(file.format).toBe(1);
    expect(file.tracks.map((track) => track.events.length)).toEqual([1, 2, 1]);
    expect(file.tracks[2]?.events[0]).toMatchObject({ channel: 5, data1: 40 });
  });

  it('reads running status', () => {
    const events = [
      noteOn(0, 0, 60),
      noteOn(0, 0, 64),
      noteOn(240, 0, 60, 0),
      noteOn(240, 0, 64, 0),
      controlChange(480, 0, 64, 127),
      controlChange(480, 0, 64, 0),
    ];
    const plain = parseTestFile({ tracks: [events] });
    const running = parseTestFile({ tracks: [events], runningStatus: true });
    const bytes = writeSmf({ tracks: [events], runningStatus: true });

    const values = (file: MidiFile): number[][] =>
      file.tracks.flatMap((track) =>
        track.events.flatMap((event) =>
          event.type === 'channel'
            ? [[event.tick, event.kind, event.channel, event.data1, event.data2]]
            : [],
        ),
      );
    const offsets = running.tracks[0]?.events.map((event) =>
      event.type === 'channel' ? bytes[event.dataOffset] : undefined,
    );

    expect(bytes.length).toBeLessThan(writeSmf({ tracks: [events] }).length);
    expect(values(running)).toEqual(values(plain));
    expect(values(running)).toHaveLength(6);
    expect(offsets).toEqual([60, 64, 60, 64, 64, 64]);
  });

  it('keeps running status after a meta event and after a SysEx event', () => {
    const result = parseMidi(
      rawTrack(
        [0x91, 60, 100],
        [0xff, 0x01, 0x01, 0x41],
        [62, 100],
        [0xf0, 0x02, 0x7e, 0xf7],
        [64, 100],
        [0xff, 0x2f, 0x00],
      ),
    );

    expect(result.ok && result.file.tracks[0]?.events.map((event) => event.type)).toEqual([
      'channel',
      'channel',
      'channel',
    ]);
  });

  it('removes SysEx events and reads the events after them (design 3.3)', () => {
    // A GS message that makes part 11 a drum part, and a SysEx continuation packet (F7).
    const gsDrumPart = [0x41, 0x10, 0x42, 0x12, 0x40, 0x1a, 0x15, 0x02, 0x0f];
    const file = parseTestFile({
      tracks: [
        [
          sysEx(0, gsDrumPart),
          noteOn(0, 10, 60),
          { tick: 10, bytes: [0xf7, 0x02, 0x01, 0x02] },
          noteOff(20, 10, 60),
        ],
      ],
    });

    expect(file.tracks[0]?.events).toEqual([
      { type: 'channel', tick: 0, kind: 0x90, channel: 10, data1: 60, data2: 100, dataOffset: 37 },
      { type: 'channel', tick: 20, kind: 0x80, channel: 10, data1: 60, data2: 64, dataOffset: 46 },
    ]);
  });

  it('reads the first track name (FF 03) of each track', () => {
    const file = parseTestFile({
      tracks: [
        [trackName('Symphony No. 5'), { ...trackName('Other'), tick: 10 }],
        [trackName('Violino I \u00e0 2'), ...NOTE],
        NOTE,
      ],
    });

    expect(file.tracks.map((track) => track.name)).toEqual([
      'Symphony No. 5',
      'Violino I \u00e0 2',
      '',
    ]);
  });

  it('reads a track name that is not UTF-8 as windows-1252, with no NUL and no outer space', () => {
    // Node 24 decodes the bytes 0x80 to 0x9F as Latin-1, so the name uses a byte above them.
    const result = parseMidi(
      rawTrack([0xff, 0x03, 0x07, 0x20, 0x43, 0x6f, 0x72, 0xe9, 0x20, 0x00]),
    );

    expect(result.ok && result.file.tracks[0]?.name).toBe('Cor\u00e9');
  });

  it('reads the first port event (FF 21) of each track, with port 0 as the default', () => {
    const file = parseTestFile({
      tracks: [
        [port(2), ...NOTE, { ...port(5), tick: 960 }],
        NOTE,
        [{ ...port(1), tick: 480 }, ...NOTE.map((event) => ({ ...event, tick: event.tick + 480 }))],
      ],
    });

    expect(file.tracks.map((track) => track.port)).toEqual([2, 0, 1]);
  });

  it('reads the tempo (FF 51) and time signature (FF 58) events in each track', () => {
    const file = parseTestFile({
      tracks: [
        [tempo(0, 120), timeSignature(0, 2, 4), tempo(960, 96)],
        [timeSignature(0, 6, 8), ...NOTE, tempo(480, 150)],
      ],
    });

    expect(
      file.tracks.map((track) => track.events.filter((event) => event.type !== 'channel')),
    ).toEqual([
      [
        { type: 'tempo', tick: 0, microsecondsPerQuarter: 500_000 },
        { type: 'time-signature', tick: 0, numerator: 2, denominator: 4 },
        { type: 'tempo', tick: 960, microsecondsPerQuarter: 625_000 },
      ],
      [
        { type: 'time-signature', tick: 0, numerator: 6, denominator: 8 },
        { type: 'tempo', tick: 480, microsecondsPerQuarter: 400_000 },
      ],
    ]);
  });

  it('ignores a tempo of 0 and a time signature with a numerator of 0', () => {
    const result = parseMidi(
      rawTrack([0xff, 0x51, 0x03, 0, 0, 0], [0xff, 0x58, 0x04, 0, 2, 24, 8], [0xff, 0x2f, 0x00]),
    );

    expect(result.ok && result.file.tracks[0]?.events).toEqual([]);
  });

  it('ends a track at its end of track event, and ignores the bytes after it', () => {
    const bytes = rawTrack([0x90, 60, 100], [0xff, 0x2f, 0x00], [0x80, 60, 0]);
    const result = parseMidi(bytes);
    const file = parseTestFile({ tracks: [[...NOTE, endOfTrack(960)]] });

    expect(result.ok && result.file.tracks[0]?.events).toHaveLength(1);
    expect(file.tracks[0]?.endTick).toBe(960);
  });

  it('ends a track with no end of track event at its last event', () => {
    const result = parseMidi(rawTrack([0x90, 60, 100], [0x80, 60, 0]));

    expect(result.ok && result.file.tracks[0]?.endTick).toBe(0);
  });

  it('skips a chunk that is not MTrk', () => {
    const bytes = writeSmf({ tracks: [NOTE] });
    const alien = [0x58, 0x46, 0x49, 0x48, 0, 0, 0, 3, 1, 2, 3];
    const withAlien = Uint8Array.from([...bytes.subarray(0, 14), ...alien, ...bytes.subarray(14)]);
    const result = parseMidi(withAlien);

    expect(result.ok && result.file.tracks[0]?.events).toHaveLength(2);
  });

  it('refuses a file of more than 4 MB (design 3.3)', () => {
    const valid = writeSmf({ tracks: [NOTE] });
    const padded = (size: number): Uint8Array => {
      const bytes = new Uint8Array(size);
      bytes.set(valid);
      // An unknown chunk fills the rest of the file, so the file stays valid.
      const length = size - valid.length - 8;
      bytes.set(
        [
          0x58,
          0x46,
          0x49,
          0x48,
          length >>> 24,
          (length >> 16) & 0xff,
          (length >> 8) & 0xff,
          length & 0xff,
        ],
        valid.length,
      );
      return bytes;
    };

    expect(MAX_FILE_BYTES).toBe(4_000_000);
    expect(refusal(padded(MAX_FILE_BYTES))).toBeUndefined();
    expect(refusal(padded(MAX_FILE_BYTES + 1))).toBe('too-large');
  });

  it('refuses a file of format 2 (design 3.3)', () => {
    expect(refusal(writeSmf({ format: 2, tracks: [NOTE, NOTE] }))).toBe('format-2');
  });

  it('refuses a file that is not a valid Standard MIDI File (design 3.3)', () => {
    const valid = writeSmf({ tracks: [NOTE] });
    const changed = (pos: number, value: number): Uint8Array => {
      const copy = valid.slice();
      copy[pos] = value;
      return copy;
    };

    expect(refusal(valid)).toBeUndefined();
    expect(refusal(new TextEncoder().encode('RIFF....RMIDdata'))).toBe('not-midi');
    expect(refusal(valid.subarray(0, 10))).toBe('not-midi');
    // Header length 5, format 3, 0 tracks, 0 ticks for each quarter, SMPTE time division.
    expect(refusal(changed(7, 5))).toBe('not-midi');
    expect(refusal(changed(9, 3))).toBe('not-midi');
    expect(refusal(changed(11, 0))).toBe('not-midi');
    expect(refusal(changed(12, 0).map((byte, i) => (i === 13 ? 0 : byte)))).toBe('not-midi');
    expect(refusal(changed(12, 0xe7))).toBe('not-midi');
    // No MTrk chunk.
    expect(refusal(valid.subarray(0, 14))).toBe('not-midi');
    // The note off ends in the middle of its data.
    expect(refusal(valid.subarray(0, valid.length - 6))).toBe('not-midi');
  });

  it('refuses a track with a broken event', () => {
    expect(refusal(rawTrack([60, 100]))).toBe('not-midi');
    expect(refusal(rawTrack([0x90, 0x85, 100]))).toBe('not-midi');
    expect(refusal(rawTrack([0xf1, 0x01]))).toBe('not-midi');
    expect(refusal(rawTrack([0xff, 0x01, 0x05, 0x41]))).toBe('not-midi');
  });

  it('refuses a variable-length number that is too long or that does not end', () => {
    const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0];
    const track = (...data: number[]): Uint8Array =>
      Uint8Array.from([...header, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, data.length, ...data]);

    expect(refusal(track(0x81, 0x80, 0x80, 0x00, 0x90, 60, 100))).toBeUndefined();
    expect(refusal(track(0x81, 0x80, 0x80, 0x80, 0x00, 0x90, 60, 100))).toBe('not-midi');
    expect(refusal(track(0x80))).toBe('not-midi');
  });
});

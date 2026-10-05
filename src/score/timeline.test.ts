import { describe, expect, it } from 'vitest';

import {
  controlChange,
  endOfTrack,
  noteOff,
  noteOn,
  port,
  programChange,
  tempo,
  timeSignature,
  trackName,
  writeSmf,
} from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import { buildTimeline } from './timeline.ts';
import type { Timeline } from './timeline.ts';

function timeline(file: TestFile): Timeline {
  const result = buildTimeline(writeSmf(file));
  if (!result.ok) {
    throw new Error(`The test file was refused: ${result.error}.`);
  }
  return result.timeline;
}

const NOTE = [noteOn(0, 0, 60), noteOff(480, 0, 60)];

describe('buildTimeline', () => {
  it('puts the channel events of all tracks in one list in seconds', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [tempo(0, 60)],
        [programChange(0, 1, 40), noteOn(480, 1, 67), noteOff(960, 1, 67)],
        [controlChange(0, 2, 7, 100), noteOn(240, 2, 48), noteOff(960, 2, 48)],
      ],
    });

    expect(result.events.map((event) => [event.timeSec, event.kind, event.data1])).toEqual([
      [0, 0xc0, 40],
      [0, 0xb0, 7],
      [0.5, 0x90, 48],
      [1, 0x90, 67],
      [2, 0x80, 67],
      [2, 0x80, 48],
    ]);
    expect(result.events.map((event) => event.synthChannel)).toEqual([1, 2, 2, 1, 1, 2]);
  });

  it('converts ticks with a tempo event of a later track (design 3.3)', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [NOTE, [tempo(240, 30)]],
    });

    expect(result.events.map((event) => event.timeSec)).toEqual([0, 0.25 + 1]);
    expect(result.tempoMap.tempoAt(480)).toBe(2_000_000);
  });

  it('uses 4/4 in a file with no time signature (design 3.3)', () => {
    const result = timeline({ tracks: [NOTE] });

    expect(result.timeSignatures).toEqual([{ tick: 0, timeSec: 0, numerator: 4, denominator: 4 }]);
  });

  it('collects the time signatures of all tracks, with their times', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [timeSignature(0, 2, 4), tempo(0, 60), timeSignature(960, 6, 8)],
        [...NOTE, timeSignature(1920, 3, 4)],
      ],
    });

    expect(result.timeSignatures).toEqual([
      { tick: 0, timeSec: 0, numerator: 2, denominator: 4 },
      { tick: 960, timeSec: 2, numerator: 6, denominator: 8 },
      { tick: 1920, timeSec: 4, numerator: 3, denominator: 4 },
    ]);
  });

  it('uses the time signature of the later track for two at the same tick (design 3.3)', () => {
    const result = timeline({
      tracks: [
        [timeSignature(0, 3, 4), timeSignature(960, 2, 4)],
        [...NOTE, timeSignature(960, 6, 8)],
        [timeSignature(0, 5, 4)],
      ],
    });

    expect(result.timeSignatures.map((item) => [item.tick, item.numerator])).toEqual([
      [0, 5],
      [960, 6],
    ]);
  });

  it('keeps 4/4 before a first time signature after tick 0', () => {
    const result = timeline({ tracks: [[...NOTE, timeSignature(960, 3, 4)]] });

    expect(result.timeSignatures.map((item) => [item.tick, item.numerator])).toEqual([
      [0, 4],
      [960, 3],
    ]);
  });

  it('gives the name of the first track as the sequence name', () => {
    const named = timeline({
      tracks: [[trackName('Hallelujah')], [trackName('Soprano'), ...NOTE]],
    });
    const unnamed = timeline({ tracks: [[], [trackName('Soprano'), ...NOTE]] });

    expect(named.sequenceName).toBe('Hallelujah');
    expect(unnamed.sequenceName).toBe('');
  });

  it('pairs two note ons on one key first in, first out (design 3.3)', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [[noteOn(0, 0, 60), noteOn(240, 0, 60), noteOff(480, 0, 60), noteOff(960, 0, 60)]],
    });

    expect(result.notes.map((note) => [note.startSec, note.endSec])).toEqual([
      [0, 0.5],
      [0.25, 1],
    ]);
    expect(result.events.map((event) => [event.kind, event.note])).toEqual([
      [0x90, 0],
      [0x90, 1],
      [0x80, 0],
      [0x80, 1],
    ]);
  });

  it('pairs the notes of each channel and key alone', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [[noteOn(0, 0, 60), noteOn(0, 1, 60), noteOn(0, 0, 62), noteOff(480, 1, 60)]],
    });

    expect(result.notes.map((note) => [note.channel, note.pitch, note.endSec])).toEqual([
      [0, 60, 0.5],
      [1, 60, 0.5],
      [0, 62, 0.5],
    ]);
    expect(result.events.map((event) => event.note)).toEqual([0, 1, 2, 1, 0, 2]);
  });

  it('reads a note on with velocity 0 as a note off (design 3.3)', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [noteOn(0, 0, 60, 90), noteOn(480, 0, 60, 0), noteOn(960, 0, 60, 70), noteOff(1440, 0, 60)],
      ],
    });

    expect(result.notes.map((note) => [note.velocity, note.startSec, note.endSec])).toEqual([
      [90, 0, 0.5],
      [70, 1, 1.5],
    ]);
    expect(result.events.map((event) => [event.kind, event.data2])).toEqual([
      [0x90, 90],
      [0x80, 0],
      [0x90, 70],
      [0x80, 64],
    ]);
  });

  it('ends a note with no note off at the end of its track (design 3.3)', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [noteOn(0, 0, 60), controlChange(1920, 0, 64, 0), endOfTrack(1920)],
        [noteOn(0, 1, 50), noteOff(3840, 1, 50)],
      ],
    });

    expect(result.notes.map((note) => note.endSec)).toEqual([2, 4]);
    expect(result.events.map((event) => [event.timeSec, event.kind, event.note])).toEqual([
      [0, 0x90, 0],
      [0, 0x90, 1],
      [2, 0xb0, -1],
      [2, 0x80, 0],
      [4, 0x80, 1],
    ]);
  });

  it('ends a note with a note off of another track on its channel, as the synth does', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [[noteOn(0, 0, 60), endOfTrack(1920)], [noteOff(480, 0, 60)]],
    });

    expect(result.notes.map((note) => note.endSec)).toEqual([0.5]);
    expect(result.events.filter((event) => event.kind === 0x80)).toHaveLength(1);
  });

  it('ends a note that stays open after the end of its track at the end of the last track', () => {
    // At tick 960, the end of track 1 ends the oldest note on key 60, which is the note of track 0.
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [noteOn(0, 0, 60), endOfTrack(1440)],
        [noteOn(480, 0, 60), endOfTrack(960)],
        [endOfTrack(2400)],
      ],
    });

    expect(result.notes.map((note) => [note.track, note.endSec])).toEqual([
      [0, 1],
      [1, 2.5],
    ]);
  });

  it('drops a note off with no open note', () => {
    const result = timeline({ tracks: [[noteOff(0, 0, 60), ...NOTE]] });

    expect(result.events.map((event) => event.kind)).toEqual([0x90, 0x80]);
  });

  it('orders the ports by number, with port 0 for a track with no port event (design 3.4)', () => {
    const notes = [noteOn(0, 2, 60), noteOff(480, 2, 60)];
    const result = timeline({
      tracks: [[port(3), ...notes], [port(1), ...notes], notes, [port(3), ...notes]],
    });

    expect(result.notes.map((note) => [note.track, note.port, note.channel])).toEqual([
      [0, 2, 2],
      [1, 1, 2],
      [2, 0, 2],
      [3, 2, 2],
    ]);
    expect(result.events.map((event) => event.synthChannel)).toEqual([
      34, 18, 2, 34, 34, 18, 2, 34,
    ]);
  });

  it('gives no port index to a port of a track with no channel events', () => {
    // The control track uses port 0, and the only track with notes uses port 2.
    const result = timeline({ tracks: [[tempo(0, 90)], [port(2), ...NOTE]] });

    expect(result.notes[0]?.port).toBe(0);
    expect(result.events.map((event) => event.synthChannel)).toEqual([0, 0]);
  });

  it('keeps the channels of two ports apart (design 3.4)', () => {
    const result = timeline({
      ticksPerQuarter: 480,
      tracks: [
        [port(0), noteOn(0, 0, 60), endOfTrack(1920)],
        [port(1), noteOn(0, 0, 60), noteOff(480, 0, 60)],
      ],
    });

    expect(result.notes.map((note) => [note.port, note.endSec])).toEqual([
      [0, 2],
      [1, 0.5],
    ]);
  });

  it('uses program 0 on a channel with no program change (design 3.3)', () => {
    const result = timeline({
      tracks: [
        [noteOn(0, 0, 60), noteOff(480, 0, 60), programChange(480, 0, 40), noteOn(480, 0, 62)],
      ],
    });

    expect(result.notes.map((note) => [note.program, note.bank])).toEqual([
      [0, 0],
      [40, 0],
    ]);
  });

  it('follows the program of each channel of each port, from all tracks', () => {
    const result = timeline({
      tracks: [
        [programChange(0, 0, 42), programChange(0, 1, 71), programChange(960, 0, 45)],
        [noteOn(480, 0, 50), noteOn(480, 1, 60), noteOn(1440, 0, 52)],
        [port(1), noteOn(480, 0, 70)],
      ],
    });

    expect(result.notes.map((note) => [note.port, note.channel, note.program])).toEqual([
      [0, 0, 42],
      [0, 1, 71],
      [1, 0, 0],
      [0, 0, 45],
    ]);
  });

  it('applies a bank select at the next program change, as the synth does (design 3.5)', () => {
    const result = timeline({
      tracks: [
        [
          controlChange(0, 0, 0, 8),
          programChange(0, 0, 48),
          noteOn(0, 0, 60),
          controlChange(480, 0, 0, 16),
          noteOn(480, 0, 62),
          programChange(960, 0, 49),
          noteOn(960, 0, 64),
        ],
      ],
    });

    expect(result.notes.map((note) => [note.bank, note.program])).toEqual([
      [8, 48],
      [8, 48],
      [16, 49],
    ]);
  });

  it('gives the drum kit of a rhythm channel of each port, with kit 0 as the default (design 3.6)', () => {
    const result = timeline({
      tracks: [
        [noteOn(0, 9, 36), programChange(480, 9, 48), noteOn(480, 9, 41)],
        [port(1), programChange(0, 9, 40), noteOn(0, 9, 38)],
      ],
    });

    expect(result.notes.map((note) => [note.port, note.channel, note.pitch, note.program])).toEqual(
      [
        [0, 9, 36, 0],
        [1, 9, 38, 40],
        [0, 9, 41, 48],
      ],
    );
  });

  it('refuses a file with no notes (design 3.3)', () => {
    const controls = writeSmf({ tracks: [[programChange(0, 0, 40), controlChange(0, 0, 7, 90)]] });
    const silent = writeSmf({ tracks: [[noteOn(0, 0, 60, 0)]] });

    expect(buildTimeline(controls)).toEqual({ ok: false, error: 'no-notes' });
    expect(buildTimeline(silent)).toEqual({ ok: false, error: 'no-notes' });
  });

  it('returns the reason of the parser for a file that it refuses', () => {
    const result = buildTimeline(writeSmf({ format: 2, tracks: [NOTE] }));

    expect(result).toEqual({ ok: false, error: 'format-2' });
  });
});

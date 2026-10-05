import { describe, expect, it } from 'vitest';

import {
  controlChange,
  endOfTrack,
  noteOff,
  noteOn,
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

import { describe, expect, it } from 'vitest';

import { noteOff, noteOn, tempo, variableLength, writeSmf } from './test-smf.ts';

describe('variableLength', () => {
  it('encodes the examples of the SMF specification', () => {
    expect(variableLength(0)).toEqual([0x00]);
    expect(variableLength(0x40)).toEqual([0x40]);
    expect(variableLength(0x7f)).toEqual([0x7f]);
    expect(variableLength(0x80)).toEqual([0x81, 0x00]);
    expect(variableLength(0x2000)).toEqual([0xc0, 0x00]);
    expect(variableLength(0x3fff)).toEqual([0xff, 0x7f]);
    expect(variableLength(0x4000)).toEqual([0x81, 0x80, 0x00]);
    expect(variableLength(0x0fffffff)).toEqual([0xff, 0xff, 0xff, 0x7f]);
  });
});

describe('writeSmf', () => {
  it('writes the header, the track chunk, and the end of track', () => {
    const bytes = writeSmf({ tracks: [[tempo(0, 120), noteOn(0, 0, 60), noteOff(480, 0, 60)]] });

    expect([...bytes]).toEqual(
      [
        [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0],
        [0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 20],
        [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20],
        [0x00, 0x90, 60, 100],
        [0x83, 0x60, 0x80, 60, 64],
        [0x00, 0xff, 0x2f, 0x00],
      ].flat(),
    );
  });

  it('leaves out a repeated status byte with running status', () => {
    const bytes = writeSmf({
      runningStatus: true,
      tracks: [[noteOn(0, 0, 60), noteOn(0, 0, 64), tempo(0, 120), noteOn(0, 0, 67)]],
    });

    expect(Array.from(bytes.slice(22))).toEqual(
      [
        [0x00, 0x90, 60, 100],
        [0x00, 64, 100],
        [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20],
        [0x00, 0x90, 67, 100],
        [0x00, 0xff, 0x2f, 0x00],
      ].flat(),
    );
  });
});

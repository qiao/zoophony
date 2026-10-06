import { describe, expect, it } from 'vitest';

import { noteNumber, parseSfz } from './sfz.ts';

describe('noteNumber', () => {
  it('reads a number or a note name, with c4 as 60', () => {
    expect([noteNumber('60'), noteNumber('c4'), noteNumber('F#3'), noteNumber('bb-1')]).toEqual([
      60, 60, 54, 10,
    ]);
  });

  it('refuses a value that is not a key', () => {
    expect(() => noteNumber('h4')).toThrow('"h4" is not a key');
  });
});

describe('parseSfz', () => {
  it('applies the opcodes of the headers before each region', () => {
    const regions = parseSfz(
      [
        '<control>',
        'default_path=Strings\\Violin Section\\susVib\\',
        '<global> ampeg_release=0.8',
        '<group> volume=20 lovel=0 hivel=62',
        '<region> sample=Vln A2 v1.wav lokey=56 hikey=57 pitch_keycenter=57 // comment',
        '<group> volume=7 lovel=63',
        '<region>',
        'sample=Vln_A2_v2.wav',
        'key=c4',
      ].join('\r\n'),
    );

    expect(regions).toEqual([
      expect.objectContaining({
        sample: 'Strings/Violin Section/susVib/Vln A2 v1.wav',
        lokey: 56,
        hikey: 57,
        pitchKeycenter: 57,
        lovel: 0,
        hivel: 62,
        volume: 20,
        ampegRelease: 0.8,
      }),
      expect.objectContaining({
        sample: 'Strings/Violin Section/susVib/Vln_A2_v2.wav',
        lokey: 60,
        hikey: 60,
        pitchKeycenter: 60,
        lovel: 63,
        hivel: 127,
        volume: 7,
        ampegRelease: 0.8,
      }),
    ]);
  });

  it('clears the group opcodes at a new global header', () => {
    const regions = parseSfz(
      '<group> tune=12 <region> sample=a.wav <global> <region> sample=b.wav',
    );

    expect(regions.map((region) => region.tune)).toEqual([12, 0]);
  });

  it('turns a velocity crossfade into a split in the middle of the crossfade', () => {
    const regions = parseSfz(
      [
        '<region> sample=soft.wav xfout_lovel=80 xfout_hivel=100',
        '<region> sample=loud.wav xfin_lovel=80 xfin_hivel=100',
      ].join('\n'),
    );

    expect(regions.map((region) => [region.lovel, region.hivel])).toEqual([
      [0, 90],
      [91, 127],
    ]);
  });

  it('keeps the round robin, the trigger, and the pedal range of a region', () => {
    const [region] = parseSfz(
      '<region> sample=a.wav seq_position=2 lorand=0.5 trigger=release locc64=65 offset=120',
    );

    expect(region).toEqual(
      expect.objectContaining({
        seqPosition: 2,
        lorand: 0.5,
        trigger: 'release',
        locc64: 65,
        hicc64: 127,
        offset: 120,
      }),
    );
  });

  it('refuses a region with no sample', () => {
    expect(() => parseSfz('<region> key=60')).toThrow('no sample');
  });
});

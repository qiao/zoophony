import { describe, expect, it } from 'vitest';

import { boneIndex } from '../src/models/rig.ts';
import { formatVersion } from './ref-tree.ts';
import {
  FORM_FORMAT,
  formJson,
  headExtent,
  parsePlayer,
  playerForm,
  readFormJson,
} from './rig-form.ts';

describe('headExtent', () => {
  it('gives the highest and the lowest corner of the head bone only', () => {
    const head = boneIndex('head');
    const mesh = {
      positions: new Float32Array([0, 1.5, 0, 0, 1.2, 0, 0, 1.9, 0, 0, 0.9, 0]),
      bones: new Uint8Array([head, head, head + 1, head + 1]),
    };
    const extent = headExtent(mesh, head);
    expect(extent.top).toBeCloseTo(1.5, 6);
    expect(extent.chin).toBeCloseTo(1.2, 6);
    expect(() => headExtent(mesh, head + 2)).toThrow('no corner on the head bone');
  });
});

describe('parsePlayer', () => {
  it('reads a species and an instrument, and refuses other text', () => {
    expect(parsePlayer('fox-red:violin')).toEqual({ species: 'fox-red', instrument: 'violin' });
    expect(() => parsePlayer('fox-red')).toThrow('<species>:<instrument>');
    expect(() => parsePlayer('fox:violin')).toThrow('<species>:<instrument>');
    expect(() => parsePlayer('fox-red:kazoo')).toThrow('<species>:<instrument>');
    expect(() => parsePlayer('fox-red:violin:x')).toThrow('<species>:<instrument>');
  });
});

describe('playerForm (design 4.4)', () => {
  it('puts the chin of the seated fox above its seat', () => {
    const form = playerForm({ species: 'fox-red', instrument: 'violin' });
    expect(form.seat).toBeGreaterThan(0);
    expect(form.visibleHead).toBeGreaterThan(0);
    expect(form.seatedTop - form.visibleHead).toBeGreaterThan(form.seat);
    expect(form.standingTop).toBeGreaterThan(form.visibleHead);
    expect(form.width).toBeGreaterThan(0);
    expect(form.depth).toBeGreaterThan(0);
  });
});

describe('readFormJson', () => {
  it('reads the players and the stages, and refuses a text with no lists', () => {
    const text = JSON.stringify({ players: [], stages: [{ demo: 'a.mid', side: 9 }] });
    expect(readFormJson(text).stages).toEqual([{ demo: 'a.mid', side: 9 }]);
    expect(() => readFormJson('{}')).toThrow('no list of players or of stages');
    const form = { players: [], stages: [{ demo: 'a.mid', side: 9 }] };
    expect(formatVersion(formJson(form))).toBe(FORM_FORMAT);
    expect(readFormJson(formJson(form))).toEqual(form);
  });
});

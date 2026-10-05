import { describe, expect, it } from 'vitest';

import { DEFAULT_TEST_NOTES, keyName, notesAt, parseKey, parseTestNotes } from './notes.ts';

describe('parseKey', () => {
  it('reads MIDI numbers and note names with C4 as 60', () => {
    expect(parseKey('60')).toBe(60);
    expect(parseKey('C4')).toBe(60);
    expect(parseKey('F#3')).toBe(54);
    expect(parseKey('Bb2')).toBe(46);
    expect(parseKey('C-1')).toBe(0);
    expect(parseKey('G9')).toBe(127);
  });

  it('refuses a text that is not a key from 0 to 127', () => {
    expect(parseKey('128')).toBeNull();
    expect(parseKey('G#9')).toBeNull();
    expect(parseKey('H2')).toBeNull();
    expect(parseKey('')).toBeNull();
  });
});

describe('keyName', () => {
  it('names a key with sharps', () => {
    expect(keyName(60)).toBe('C4');
    expect(keyName(54)).toBe('F#3');
    expect(keyName(0)).toBe('C-1');
  });
});

describe('parseTestNotes', () => {
  it('reads one note on each line and ignores empty lines', () => {
    expect(parseTestNotes('0 0.5 C4\n\n  1.5   1 67  ')).toEqual({
      ok: true,
      notes: [
        { start: 0, length: 0.5, key: 60 },
        { start: 1.5, length: 1, key: 67 },
      ],
    });
  });

  it('gives the first line that is not valid', () => {
    expect(parseTestNotes('0 1 C4\n1 0 C4')).toEqual({ ok: false, line: 2 });
    expect(parseTestNotes('-1 1 C4')).toEqual({ ok: false, line: 1 });
    expect(parseTestNotes('0 1 C4 x')).toEqual({ ok: false, line: 1 });
    expect(parseTestNotes('0 1')).toEqual({ ok: false, line: 1 });
  });

  it('accepts the default list', () => {
    const result = parseTestNotes(DEFAULT_TEST_NOTES);
    expect(result.ok && result.notes).toHaveLength(5);
  });
});

describe('notesAt', () => {
  it('finds the notes that sound at a time, with the end excluded', () => {
    const notes = [
      { start: 0, length: 1, key: 60 },
      { start: 0.5, length: 1, key: 64 },
    ];
    expect(notesAt(notes, 0.75).map((n) => n.key)).toEqual([60, 64]);
    expect(notesAt(notes, 1).map((n) => n.key)).toEqual([64]);
    expect(notesAt(notes, 1.5)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  CAMERA_OFF_TEXTS,
  FILE_FAILURE_TEXT,
  LOAD_FAILURE_TEXT,
  NO_WEBGL2_TEXT,
  PLAY_FAILURE_TEXT,
  addNote,
  failureMessage,
  followMessage,
  noteMessage,
  textMessage,
} from './messages.ts';

describe('the message texts (design 2.8)', () => {
  it('gives the failures and the missing WebGL2 the texts of the design', () => {
    expect(FILE_FAILURE_TEXT).toBe('The demo did not load. Check the connection, then try again.');
    expect(LOAD_FAILURE_TEXT).toBe(
      'The instruments did not load. Check the connection, then try again.',
    );
    expect(NO_WEBGL2_TEXT).toBe(
      'This browser cannot show the orchestra, because it does not support WebGL2. Use a current version of Chrome, Firefox, or Safari.',
    );
  });
});

describe('failureMessage (design 2.8, 6.8)', () => {
  it('gives each failure its text and the retry button', () => {
    expect(failureMessage('file', 10)).toEqual({
      kind: 'error',
      text: FILE_FAILURE_TEXT,
      retry: true,
      closesAtSec: 16,
    });
    expect(failureMessage('load', 10)).toEqual({
      kind: 'error',
      text: LOAD_FAILURE_TEXT,
      retry: true,
      closesAtSec: 16,
    });
    expect(failureMessage('play', 10)).toEqual({
      kind: 'error',
      text: PLAY_FAILURE_TEXT,
      retry: true,
      closesAtSec: 16,
    });
  });
});

describe('followMessage (design 2.8)', () => {
  it('closes a message after 6 s', () => {
    const message = textMessage('This MIDI file has no notes.', 10);
    expect(message.retry).toBe(false);
    expect(followMessage(message, 15.9, false)).toBe(message);
    expect(followMessage(message, 16, false)).toBeNull();
    expect(followMessage(null, 16, false)).toBeNull();
  });

  it('keeps a message while the user holds it, and closes it 6 s after the user leaves it', () => {
    let message = followMessage(textMessage('This file is not a valid MIDI file.', 10), 15, true);
    message = followMessage(message, 20, true);
    expect(message?.closesAtSec).toBe(26);
    expect(followMessage(message, 25.9, false)).toBe(message);
    expect(followMessage(message, 26, false)).toBeNull();
  });
});

describe('the note of the camera (design 2.8, audit 2026-10-05-ux-design, CT2)', () => {
  it('closes after 3 s, with an accent bar and no button', () => {
    const note = noteMessage(CAMERA_OFF_TEXTS.keyboard, 10);
    expect(note).toEqual({
      kind: 'note',
      text: 'The automatic camera is off. Press C to turn it on.',
      retry: false,
      closesAtSec: 13,
    });
    expect(followMessage(note, 12.9, false)).toBe(note);
    expect(followMessage(note, 13, false)).toBeNull();
    expect(followMessage(note, 12, true)?.closesAtSec).toBe(15);
  });

  it('does not replace a failure with "Try again"', () => {
    const note = noteMessage(CAMERA_OFF_TEXTS.touch, 10);
    const failure = failureMessage('load', 9);
    expect(addNote(failure, note)).toBe(failure);
    expect(addNote(null, note)).toBe(note);
    expect(addNote(textMessage('This MIDI file has no notes.', 9), note)).toBe(note);
  });
});

import { describe, expect, it } from 'vitest';

import {
  FILE_FAILURE_TEXT,
  LOAD_FAILURE_TEXT,
  NO_WEBGL2_TEXT,
  PLAY_FAILURE_TEXT,
  failureMessage,
  followMessage,
  textMessage,
} from './messages.ts';

describe('the message texts (design 2.8)', () => {
  it('gives the failures and the missing WebGL2 the texts of the design', () => {
    // The button "Try again" stands next to the text, so the text does not repeat it (audit
    // 2026-10-05-ux-design, LE4).
    expect(FILE_FAILURE_TEXT).toBe('The demo did not load. Check the connection.');
    expect(LOAD_FAILURE_TEXT).toBe('The instruments did not load. Check the connection.');
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

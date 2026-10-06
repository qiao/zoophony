import { describe, expect, it } from 'vitest';

import { clockText, seekValueText, songTimeValue, spokenTime, wholeSeconds } from './time-text.ts';

describe('wholeSeconds (design 8.2)', () => {
  it('rounds down, and keeps a song that ends just below a whole second', () => {
    expect(wholeSeconds(280.667)).toBe(280);
    expect(wholeSeconds(254.9998)).toBe(255);
    expect(wholeSeconds(254.99)).toBe(254);
  });
});

describe('clockText (design 2.8)', () => {
  it('gives minutes and two digits of seconds', () => {
    expect(clockText(0)).toBe('0:00');
    expect(clockText(5.9)).toBe('0:05');
    expect(clockText(83)).toBe('1:23');
    expect(clockText(421)).toBe('7:01');
  });

  it('shows a time below 0, in the count-in, as 0:00', () => {
    expect(clockText(-1.017)).toBe('0:00');
  });
});

describe('spokenTime', () => {
  it('names the minutes and the seconds in the singular or the plural', () => {
    expect(spokenTime(0)).toBe('0 seconds');
    expect(spokenTime(1)).toBe('1 second');
    expect(spokenTime(83)).toBe('1 minute 23 seconds');
    expect(spokenTime(121)).toBe('2 minutes 1 second');
    expect(spokenTime(300)).toBe('5 minutes');
    expect(spokenTime(-2)).toBe('0 seconds');
  });
});

describe('seekValueText (design 2.8)', () => {
  it('gives the example texts of the spec', () => {
    expect(seekValueText(83, 316)).toBe('1 minute 23 seconds of 5 minutes 16 seconds');
    expect(seekValueText(0, 280)).toBe('0 seconds of 4 minutes 40 seconds');
  });
});

describe('songTimeValue (design 9.3)', () => {
  it('keeps the sign of the count-in, with one decimal', () => {
    expect(songTimeValue(-1.617)).toBe('-1.6');
    expect(songTimeValue(0)).toBe('0.0');
    expect(songTimeValue(2.46)).toBe('2.5');
  });
});

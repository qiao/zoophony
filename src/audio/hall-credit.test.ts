import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HALL_CREDIT, KONZERTHAUS_CREDIT } from './hall-credit.ts';

/** The folder of the hall impulse response. */
const HALL_DIR = join(import.meta.dirname, '..', '..', 'assets', 'hall');

describe('HALL_CREDIT (design 2.8, 7.3)', () => {
  it('has the credit line of the README of the asset', async () => {
    const readme = await readFile(join(HALL_DIR, 'README.md'), 'utf8');
    const quotes = readme.split('\n\n').map((block) =>
      block
        .split('\n')
        .filter((line) => line.startsWith('> '))
        .map((line) => line.slice(2))
        .join(' '),
    );
    expect(quotes).toContain(HALL_CREDIT.text);
    expect(quotes).toContain(KONZERTHAUS_CREDIT.text);
  });

  it('names the file that the README describes, with its checksum', async () => {
    const readme = await readFile(join(HALL_DIR, 'README.md'), 'utf8');
    const wav = await readFile(join(HALL_DIR, 'st-pauls-hall-c8m.wav'));
    const sha = createHash('sha256').update(wav).digest('hex');
    expect(readme).toContain(`| SHA-256 | \`${sha}\` |`);
    expect(HALL_CREDIT.text).toContain('CC BY 4.0');
  });
});

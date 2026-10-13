import { describe, expect, it } from 'vitest';

import { findRows, isTableRow, removedTerms } from './decision-rows.ts';
import type { Term } from './decision-rows.ts';

/** A decision file with a header, a separator, two rows, and a paragraph. */
const FILE = {
  path: 'docs/decisions/2026-10-13-a.md',
  text: [
    '# Decisions of A',
    '',
    'The paragraph names `seatHeights()` and is no row.',
    '',
    '| Decision | Section |',
    '|---|---|',
    '| The `seatHeights()` of `src/models/props.ts` drops the seat of a Bear | 4.4 |',
    '| The length of the legs uses `legLength` | 4.5 |',
  ].join('\n'),
};

/**
 * Gives the code terms of a list of texts.
 *
 * @param texts The texts.
 * @returns The terms.
 */
function code(...texts: readonly string[]): Term[] {
  return texts.map((text) => ({ text, kind: 'code' }));
}

/**
 * Gives the texts of the terms that a diff removes.
 *
 * @param lines The lines of the diff.
 * @returns The texts.
 */
function removedTexts(...lines: readonly string[]): string[] {
  return removedTerms(lines.join('\n')).map((term) => term.text);
}

describe('isTableRow', () => {
  it('takes the rows with text, and not the separator row', () => {
    expect(isTableRow('| Decision | Section |')).toBe(true);
    expect(isTableRow('|---|---|')).toBe(false);
    expect(isTableRow('| :--- | ---: |')).toBe(false);
    expect(isTableRow('The text | of a paragraph')).toBe(false);
  });
});

describe('removedTerms', () => {
  it('gives the identifiers and the string literals of the removed code', () => {
    expect(
      removedTexts(
        '--- a/src/models/props.ts',
        '+++ b/src/models/props.ts',
        "-import { seatHeights } from './models/props.ts';",
        "-  const drop = riggedDrop(species, 'rigged-body');",
      ),
    ).toEqual(['drop', 'models/props.ts', 'rigged-body', 'riggedDrop', 'seatHeights', 'species']);
  });

  it('skips the terms that an added line holds, the comments, and the common words', () => {
    expect(
      removedTexts(
        '-  return poseAt(score, time); // the old seatHeights call',
        '+  return poseAt(score, time + lead);',
        '-  // The comment names legLength.',
        '-   * The doc comment names legLength too.',
        '-  const value: string = undefined;',
      ),
    ).toEqual(['value']);
  });

  it('skips the short terms and the long literals of data', () => {
    expect(removedTexts(`-  const ab = 'xy';`, `-  const mesh = '${'A'.repeat(200)}';`)).toEqual([
      'mesh',
    ]);
  });
});

describe('findRows', () => {
  it('finds a search term in a table row with no regard to case', () => {
    const rows = findRows([FILE], [{ text: 'bear', kind: 'search' }]);

    expect(rows).toEqual([
      {
        path: FILE.path,
        line: 7,
        text: '| The `seatHeights()` of `src/models/props.ts` drops the seat of a Bear | 4.4 |',
        terms: ['bear'],
      },
    ]);
  });

  it('finds a code term only as a whole name in a code span', () => {
    const rows = findRows([FILE], code('seatHeights', 'length', 'models/props.ts', 'Height'));

    expect(rows.map((row) => [row.line, row.terms])).toEqual([
      [7, ['seatHeights', 'models/props.ts']],
    ]);
  });
});

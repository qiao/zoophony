import { describe, expect, it } from 'vitest';

import { parseOptions } from './pose-depth.ts';

describe('parseOptions', () => {
  it('reads the flag --gaps with no value beside the options with a value', () => {
    const options = parseOptions([
      'pianist',
      '--demo',
      'bach-bwv1048.mid',
      '--gaps',
      '--into',
      'case',
    ]);
    expect(options.gaps).toBe(true);
    expect(options.demos).toEqual(['bach-bwv1048']);
    expect(options.into).toEqual(['case']);
    expect(parseOptions(['conductor']).gaps).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { checkTable, failedChecks } from './keyboard-check.ts';
import type { KeyCheck } from './keyboard-check.ts';

const CHECKS: readonly KeyCheck[] = [
  { size: '1440 × 900', control: 'Mute', keys: 'Tab, Space', result: 'pressed', pass: true },
  {
    size: '390 × 844',
    control: 'Speed',
    keys: 'Tab, 0',
    result: 'a | b',
    pass: false,
  },
];

describe('checkTable', () => {
  it('writes one row for each check, with the pipes of a cell escaped', () => {
    expect(checkTable(CHECKS).split('\n')).toEqual([
      '| Size | Control | Keys | Result | Check |',
      '|---|---|---|---|---|',
      '| 1440 × 900 | Mute | Tab, Space | pressed | pass |',
      '| 390 × 844 | Speed | Tab, 0 | a \\| b | fail |',
    ]);
  });
});

describe('failedChecks', () => {
  it('lists only the failed checks', () => {
    expect(failedChecks(CHECKS)).toEqual(['390 × 844: Speed (Tab, 0): a | b']);
    expect(failedChecks(CHECKS.slice(0, 1))).toEqual([]);
  });
});

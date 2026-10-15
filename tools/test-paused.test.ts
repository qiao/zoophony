import { describe, expect, it } from 'vitest';

import {
  PAUSED_PATHS,
  failedTests,
  newFailures,
  parsePausedArgs,
  vitestArgs,
} from './test-paused.ts';

describe('parsePausedArgs', () => {
  it('reads the ref of --base and the paths, in any order', () => {
    expect(parsePausedArgs([])).toEqual({ base: null, paths: [] });
    expect(parsePausedArgs(['a.test.ts', '--base', 'main', 'b.test.ts'])).toEqual({
      base: 'main',
      paths: ['a.test.ts', 'b.test.ts'],
    });
  });

  it('stops on --base with no value or two times, and on an unknown option', () => {
    expect(() => parsePausedArgs(['--base'])).toThrow(/takes one commit/);
    expect(() => parsePausedArgs(['--base', '--x'])).toThrow(/takes one commit/);
    expect(() => parsePausedArgs(['--base', 'a', '--base', 'b'])).toThrow(/takes one commit/);
    expect(() => parsePausedArgs(['--watch'])).toThrow(/not known/);
  });
});

describe('vitestArgs', () => {
  it('runs the project paused once with the JSON report, and passes with no test file', () => {
    expect(vitestArgs('/t/base.json', ['a.test.ts'])).toEqual([
      'run',
      '--project',
      'paused',
      '--reporter=json',
      '--outputFile=/t/base.json',
      '--passWithNoTests',
      'a.test.ts',
    ]);
  });

  it('copies the source, the tools, the demos, the design, and the config of Vitest', () => {
    for (const path of ['src', 'tools', 'demos', 'docs/design', 'vite.config.ts']) {
      expect(PAUSED_PATHS).toContain(path);
    }
  });
});

describe('failedTests', () => {
  const report = JSON.stringify({
    testResults: [
      {
        name: '/r/src/a.test.ts',
        status: 'failed',
        assertionResults: [
          { fullName: 'a passes', status: 'passed' },
          { fullName: 'a fails', status: 'failed' },
        ],
      },
      { name: '/r/src/b.test.ts', status: 'failed', assertionResults: [] },
      { name: '/r/src/c.test.ts', status: 'passed', assertionResults: [{ status: 'skipped' }] },
    ],
  });

  it('gives each failed test with its file from the root, and a file that fails with no test', () => {
    expect(failedTests(report, '/r')).toEqual([
      'src/a.test.ts > a fails',
      'src/b.test.ts > (the file fails with no failed test)',
    ]);
  });

  it('stops on a report with no list of test files', () => {
    expect(() => failedTests('{}', '/r')).toThrow('no list of test files');
  });
});

describe('newFailures', () => {
  it('gives the failed tests of the working tree that do not fail on the commit', () => {
    expect(newFailures(['a > x', 'b > y'], ['b > y', 'c > z', 'a > w'])).toEqual([
      'c > z',
      'a > w',
    ]);
    expect(newFailures(['a > x'], [])).toEqual([]);
  });
});

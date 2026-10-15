import { describe, expect, it } from 'vitest';

import {
  PAUSED_PATHS,
  newFailures,
  parsePausedArgs,
  readReport,
  runIssues,
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
  it('runs the project paused once with the reporter of the tool, and passes with no test file', () => {
    const args = vitestArgs('/t/base.json', ['a.test.ts']);
    expect(args.slice(0, 3)).toEqual(['run', '--project', 'paused']);
    expect(args[3]).toMatch(/^--reporter=.*tools\/paused-reporter\.ts$/);
    expect(args.slice(4)).toEqual(['--outputFile=/t/base.json', '--passWithNoTests', 'a.test.ts']);
  });

  it('copies the source, the tools, the demos, the design, and the config of Vitest', () => {
    for (const path of ['src', 'tools', 'demos', 'docs/design', 'vite.config.ts']) {
      expect(PAUSED_PATHS).toContain(path);
    }
  });
});

describe('readReport and runIssues', () => {
  const report = readReport(
    JSON.stringify({
      reason: 'failed',
      failed: [['src/a.test.ts', 'a', 'fails']],
      unhandled: ['Error: lost'],
    }),
  );

  it('gives each failed test by its title path and each unhandled error', () => {
    expect(runIssues(report, 1)).toEqual([
      'src/a.test.ts > a > fails',
      '(unhandled error) Error: lost',
    ]);
  });

  it('gives the exit code of a run that fails with no failed test and no error', () => {
    const empty = { reason: 'failed', failed: [], unhandled: [] };
    expect(runIssues(empty, 1)).toEqual(['(exit code 1 with no failed test and no error)']);
    expect(runIssues(empty, null)).toEqual(['(exit code null with no failed test and no error)']);
    expect(runIssues(empty, 0)).toEqual([]);
  });

  it('stops on a report with no lists', () => {
    expect(() => readReport('{}')).toThrow('no list of failed tests');
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

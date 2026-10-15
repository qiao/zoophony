import { spawnSync } from 'node:child_process';
import { readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { messageLine } from './paused-reporter.ts';
import { ROOT } from './ref-tree.ts';
import { readReport } from './test-paused.ts';

describe('messageLine', () => {
  it('keeps the first line, with <root> for the root of the run', () => {
    expect(messageLine('Cannot read /tmp/r/src/a.ts\n  at x', '/tmp/r')).toBe(
      'Cannot read <root>/src/a.ts',
    );
  });
});

describe('the paused reporter', () => {
  it('writes each failed test by its title path and each unhandled error of a run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'paused-reporter-'));
    try {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
      writeFileSync(
        join(dir, 'vitest.config.mjs'),
        "export default { test: { include: ['*.test.mjs'] } };\n",
      );
      writeFileSync(
        join(dir, 'a.test.mjs'),
        [
          "import { describe, it } from 'vitest';",
          "describe('s', () => {",
          "  it('fails', () => { throw new Error('x'); });",
          "  it('passes', () => {});",
          '});',
          "it('loses a rejection', () => { void Promise.reject(new Error('lost')); });",
        ].join('\n'),
      );
      const json = join(dir, 'report.json');
      const reporter = join(ROOT, 'tools', 'paused-reporter.ts');
      const vitest = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
      const run = spawnSync(
        process.execPath,
        [vitest, 'run', `--reporter=${reporter}`, `--outputFile=${json}`],
        { cwd: dir, encoding: 'utf8' },
      );
      expect(run.status).toBe(1);
      const report = readReport(readFileSync(json, 'utf8'));
      expect(report.reason).toBe('failed');
      expect(report.failed).toEqual([['a.test.mjs', 's', 'fails']]);
      expect(report.unhandled).toEqual(['Error: lost']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

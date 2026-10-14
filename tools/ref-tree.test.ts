import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { errorCause, shortHash, withRefTree } from './ref-tree.ts';

describe('errorCause', () => {
  it('keeps the lines before the stack of an error', () => {
    const errors = [
      'file:///tmp/body-probe-x/tools/body-probe.ts:37',
      "import { LOWER_MAX_SEC } from '../src/pose/rest.ts';",
      "SyntaxError: The requested module '../src/pose/rest.ts' does not provide an export named 'LOWER_MAX_SEC'",
      '    at ModuleJob._instantiate (node:internal/modules/esm/module_job:180:21)',
      '    at async ModuleJob.run (node:internal/modules/esm/module_job:369:5)',
      '',
      'Node.js v24.10.0',
    ].join('\n');
    expect(errorCause(errors).split('\n')).toEqual([
      'file:///tmp/body-probe-x/tools/body-probe.ts:37',
      "import { LOWER_MAX_SEC } from '../src/pose/rest.ts';",
      "SyntaxError: The requested module '../src/pose/rest.ts' does not provide an export named 'LOWER_MAX_SEC'",
    ]);
  });

  it('keeps all lines when there is no stack', () => {
    expect(errorCause('fatal: not a valid object name no-such-ref\n')).toBe(
      'fatal: not a valid object name no-such-ref',
    );
  });
});

describe('withRefTree', () => {
  it('extracts the paths of a commit, and removes the folder also after a failure', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'ref-tree-test-'));
    try {
      const text = await withRefTree(
        'HEAD',
        async (dir) => {
          // The folder holds only the extracted paths while the function runs.
          expect(readdirSync(parent)).toHaveLength(1);
          expect(existsSync(join(dir, 'src'))).toBe(false);
          return readFileSync(join(dir, 'package.json'), 'utf8');
        },
        { parent, paths: ['package.json'] },
      );
      expect(JSON.parse(text)).toHaveProperty('name', 'zoophony');
      expect(await readdir(parent)).toEqual([]);

      const failing = withRefTree('HEAD', () => Promise.reject(new Error('the reader fails')), {
        parent,
        paths: ['package.json'],
      });
      await expect(failing).rejects.toThrow('the reader fails');
      expect(await readdir(parent)).toEqual([]);

      const unknown = withRefTree('no-such-ref', () => Promise.resolve(0), { parent });
      await expect(unknown).rejects.toThrow('no-such-ref');
      expect(await readdir(parent)).toEqual([]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});

describe('shortHash', () => {
  it('gives the short hash of a commit, and stops on an unknown ref', () => {
    expect(shortHash('HEAD')).toMatch(/^[0-9a-f]{7,}$/);
    expect(() => shortHash('no-such-ref')).toThrow('no-such-ref');
  });
});

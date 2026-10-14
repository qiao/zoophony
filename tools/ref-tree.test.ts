import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { errorCause, optionValue, shortHash, withRefTree } from './ref-tree.ts';

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

describe('optionValue', () => {
  it('gives the value of an option, null with no option, and undefined with no value', () => {
    expect(optionValue(['--base', 'main'], '--base')).toBe('main');
    expect(optionValue([], '--base')).toBeNull();
    expect(optionValue(['--base'], '--base')).toBeUndefined();
    expect(optionValue(['--base', '--url', 'x'], '--base')).toBeUndefined();
  });
});

/** A child process of a test that holds a tree of a commit, and its end. */
interface Holder {
  /** The child process, which leads a process group of its own, as a tool in a terminal. */
  readonly child: ChildProcess;
  /** The exit code of the child, or `null` when a signal stopped it. */
  readonly closed: Promise<number | null>;
  /** The output of the child so far. */
  readonly output: () => string;
}

/**
 * Starts a Node child that runs a script with `withRefTree()` and `runChild()` of this module.
 *
 * @param script The body of the script. It reads the parent folder from `REF_TREE_PARENT`.
 * @param parent The folder that holds the temporary folder.
 * @param path The value of `PATH`.
 * @returns The child.
 */
function hold(script: string, parent: string, path = process.env['PATH'] ?? ''): Holder {
  const module = JSON.stringify(join(import.meta.dirname, 'ref-tree.ts'));
  const code = `import { runChild, withRefTree } from ${module};\n${script}`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, PATH: path, REF_TREE_PARENT: parent },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout?.setEncoding('utf8').on('data', (text: string) => {
    output += text;
  });
  child.stderr?.setEncoding('utf8').on('data', (text: string) => {
    output += text;
  });
  const closed = new Promise<number | null>((resolve) => {
    child.on('close', (status) => resolve(status));
  });
  return { child, closed, output: () => output };
}

/**
 * Waits until a condition holds, for at most 10 s.
 *
 * @param condition The condition.
 */
async function waitFor(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(condition()).toBe(true);
}

/**
 * Tells if a process with a text in its command line runs.
 *
 * @param text The text.
 * @returns True if such a process runs.
 */
function runs(text: string): boolean {
  return spawnSync('pgrep', ['-f', text]).status === 0;
}

describe('withRefTree after Ctrl-C', () => {
  it('ends a child of runChild, removes the folder, and exits with 130, also after a second INT', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'ref-tree-stop-'));
    const marker = `ref-tree-wait-${process.pid}-${Date.now()}`;
    try {
      // The child waits in the folder, as the build of a commit does.
      const holder = hold(
        [
          "await withRefTree('HEAD', async (dir) => {",
          `  const waiting = runChild(process.execPath, ['-e', 'setTimeout(() => {}, 20000) // ${marker}'], dir);`,
          '  console.log(dir);',
          '  await waiting;',
          "}, { parent: process.env.REF_TREE_PARENT, paths: ['package.json'] });",
        ].join('\n'),
        parent,
      );
      await waitFor(() => holder.output().includes(parent) && runs(marker));
      const dir = holder.output().trim();
      expect(existsSync(dir)).toBe(true);

      // Ctrl-C sends INT to each process of the group of the terminal. Then pnpm sends a second
      // INT to its child, the tool.
      process.kill(-(holder.child.pid ?? 0), 'SIGINT');
      process.kill(holder.child.pid ?? 0, 'SIGINT');
      expect(await holder.closed).toBe(130);
      expect(existsSync(dir)).toBe(false);
      expect(runs(marker)).toBe(false);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});

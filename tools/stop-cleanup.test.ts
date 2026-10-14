import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { stopChildren, trackChild } from './stop-cleanup.ts';

/**
 * Tells if a process runs.
 *
 * @param pid The id of the process.
 * @returns True if the process exists.
 */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gives the first line of the output of a child process.
 *
 * @param child The child process, with its output in a pipe.
 * @returns A promise of the line.
 */
function firstLine(child: ChildProcess): Promise<string> {
  return new Promise((done) => {
    let text = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (part: string) => {
      text += part;
      if (text.includes('\n')) {
        done(text.split('\n')[0] ?? '');
      }
    });
  });
}

/**
 * Gives the exit code of a child process at its close.
 *
 * @param child The child process.
 * @returns A promise of the exit code.
 */
function closed(child: ChildProcess): Promise<number | null> {
  return new Promise((done) => child.once('close', (code) => done(code)));
}

describe('the cleanup after a stop (tools/stop-cleanup.ts)', () => {
  const parent = mkdtempSync(join(tmpdir(), 'stop-cleanup-test-'));
  afterAll(() => rmSync(parent, { recursive: true, force: true }));

  it('stops a long child, removes the folder, and ends with 130 after the signal TERM', async () => {
    const script = join(parent, 'tool.ts');
    writeFileSync(
      script,
      [
        "import { spawn } from 'node:child_process';",
        "import { mkdtempSync } from 'node:fs';",
        "import { join } from 'node:path';",
        `import { trackChild, trackFolder } from ${JSON.stringify(join(import.meta.dirname, 'stop-cleanup.ts'))};`,
        `const dir = mkdtempSync(join(${JSON.stringify(parent)}, 'held-'));`,
        'trackFolder(dir);',
        "const child = trackChild(spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']));",
        'console.log(JSON.stringify({ pid: child.pid, dir }));',
      ].join('\n'),
    );
    const tool = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'inherit'] });
    const end = closed(tool);
    // SAFETY: the script prints this object as its first line.
    const held = JSON.parse(await firstLine(tool)) as { pid: number; dir: string };
    expect(alive(held.pid)).toBe(true);
    expect(existsSync(held.dir)).toBe(true);

    tool.kill('SIGTERM');

    expect(await end).toBe(130);
    expect(alive(held.pid)).toBe(false);
    expect(existsSync(held.dir)).toBe(false);
  });

  it('kills a child that does not stop on the signal TERM', async () => {
    const child = trackChild(
      spawn(
        process.execPath,
        [
          '-e',
          "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000);",
        ],
        { stdio: ['ignore', 'pipe', 'inherit'] },
      ),
    );
    await firstLine(child);

    await stopChildren(200);

    expect(child.signalCode).toBe('SIGKILL');
  });
});

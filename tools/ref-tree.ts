/**
 * Puts the tree of a commit into a temporary folder, so that a tool can compare the working tree
 * with a commit, a branch, or a tag (`--base <ref>` of `pnpm body-probe`, `pnpm size`, and
 * `pnpm close-views`).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The repository root. */
export const ROOT = join(import.meta.dirname, '..');

/**
 * Gives the cause of a failure from the error output of a command: the lines before the first
 * line of the stack, such as the place, the line of code, and the message of a `SyntaxError`.
 *
 * @param errors The error output.
 * @returns The lines before the stack, or all lines when there is no stack.
 */
export function errorCause(errors: string): string {
  const lines = errors.trim().split('\n');
  const stack = lines.findIndex((line) => /^\s+at /.test(line));
  return (stack > 0 ? lines.slice(0, stack) : lines).join('\n').trim();
}

/**
 * Runs a command, and stops on a failure.
 *
 * @param command The command.
 * @param args The arguments.
 * @param cwd The folder of the command.
 * @throws Error if the command fails, with the cause from its error output.
 */
export function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    const reason = result.error?.message ?? errorCause(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed: ${reason}`);
  }
}

/**
 * Starts a command, and gives a promise of its end. The command runs beside the code of the
 * caller.
 *
 * @param command The command.
 * @param args The arguments.
 * @param cwd The folder of the command.
 * @returns A promise that resolves when the command ends with no failure.
 */
export function runChild(command: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (text: string) => {
      errors += text;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      if (status === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed:\n${errorCause(errors)}`));
    });
  });
}

/** The options of {@link withRefTree}. */
export interface RefTreeOptions {
  /** The folder that holds the temporary folder. The default is the temporary folder of the OS. */
  readonly parent?: string;
  /** The start of the name of the temporary folder, such as `body-probe-`. */
  readonly prefix?: string;
  /** The paths of the commit to extract. The default is the whole tree. */
  readonly paths?: readonly string[];
}

/**
 * Extracts the tree of a commit into a new temporary folder, and gives the folder to a function.
 * The extraction and the start of the function run before the first `await`, so a child process
 * that the function starts at once runs beside the code of the caller. The folder goes away at
 * the end, also after a failure or a stop (INT or TERM).
 *
 * @param ref The commit, a branch, or a tag.
 * @param use The function that reads the folder.
 * @param options The parent folder, the start of the name, and the paths.
 * @returns The result of the function.
 * @throws Error if git does not know the ref, or the function fails.
 */
export async function withRefTree<T>(
  ref: string,
  use: (dir: string) => Promise<T>,
  options: RefTreeOptions = {},
): Promise<T> {
  const dir = mkdtempSync(join(options.parent ?? tmpdir(), options.prefix ?? 'ref-'));
  const stop = (): void => {
    rmSync(dir, { recursive: true, force: true });
    process.exit(130);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    run('git', ['archive', '--output', join(dir, 'ref.tar'), ref, ...(options.paths ?? [])], ROOT);
    run('tar', ['-xf', 'ref.tar'], dir);
    rmSync(join(dir, 'ref.tar'));
    return await use(dir);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await rm(dir, { recursive: true, force: true });
  }
}

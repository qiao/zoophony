/**
 * Puts the tree of a commit into a temporary folder, so that a tool can compare the working tree
 * with a commit, a branch, or a tag (`--base <ref>` of `pnpm body-probe`, `pnpm size`, and
 * `pnpm close-views`).
 */
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
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
 * @throws Error if the command fails, with the cause from its error output. After INT or TERM, the
 *   tool removes each temporary folder and exits.
 */
export function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.signal === 'SIGINT' || result.signal === 'SIGTERM') {
    // The signal of a stop reached the command too. The stop listener of withRefTree() waits for
    // the event loop, so the tool stops here.
    stopNow(result.signal);
  }
  if (result.status !== 0) {
    const reason = result.error?.message ?? errorCause(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed: ${reason}`);
  }
}

/** The child processes of {@link runChild} that run now. A stop ends them first. */
const running = new Set<ChildProcess>();

/**
 * Starts a command, and gives a promise of its end. The command runs beside the code of the
 * caller, in a process group of its own. Thus Ctrl-C does not stop it in the middle of a write
 * into a temporary folder. The stop of {@link withRefTree} ends its group first.
 *
 * @param command The command.
 * @param args The arguments.
 * @param cwd The folder of the command.
 * @returns A promise that resolves when the command ends with no failure.
 */
export function runChild(command: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      detached: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    running.add(child);
    let errors = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (text: string) => {
      errors += text;
    });
    child.on('error', (error) => {
      running.delete(child);
      reject(error);
    });
    child.on('close', (status) => {
      running.delete(child);
      if (status === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed:\n${errorCause(errors)}`));
    });
  });
}

/**
 * Ends the process group of a child, and waits for the end of the child: TERM first, and KILL
 * after 5 s.
 *
 * @param child The child process of {@link runChild}.
 * @returns A promise that resolves when the child has ended.
 */
function endChild(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (child.exitCode !== null || child.signalCode !== null || pid === undefined) {
    return Promise.resolve();
  }

  const signal = (name: NodeJS.Signals): void => {
    try {
      process.kill(-pid, name);
    } catch {
      // The group has ended.
    }
  };
  return new Promise((resolve) => {
    const kill = setTimeout(() => signal('SIGKILL'), 5000);
    child.once('close', () => {
      clearTimeout(kill);
      resolve();
    });
    signal('SIGTERM');
  });
}

/** The temporary folders of {@link withRefTree} that exist now. */
const held = new Set<string>();

/**
 * Removes each temporary folder of {@link withRefTree} that exists now. The exit of the process
 * calls it too, also after an error.
 */
function removeHeld(): void {
  for (const dir of held) {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  held.clear();
}

process.on('exit', removeHeld);

/** The stop that runs, or `null`. A second signal during a stop starts no second stop. */
let stopping: Promise<void> | null = null;

/**
 * Stops the tool after INT or TERM: ends the process group of each child of {@link runChild},
 * waits for them, removes each temporary folder, and exits with 128 plus the number of the
 * signal. The listener stays during the stop, because `pnpm` sends a second INT to the tool after
 * the INT of the terminal, and with no listener that INT ends the process at once.
 *
 * @param signal The signal.
 */
function stopAfter(signal: NodeJS.Signals): void {
  stopping ??= (async (): Promise<void> => {
    await Promise.all([...running].map(endChild));
    removeHeld();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  })();
}

/**
 * Stops the tool at once after INT or TERM during a synchronous command: sends TERM to the group
 * of each child of {@link runChild}, removes each temporary folder, and exits with 128 plus the
 * number of the signal.
 *
 * @param signal The signal.
 */
function stopNow(signal: NodeJS.Signals): never {
  for (const child of running) {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // The group has ended.
      }
    }
  }
  removeHeld();
  process.exit(signal === 'SIGINT' ? 130 : 143);
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
 * the end, also after a failure or a stop (INT or TERM). A stop first ends each child of
 * {@link runChild} and waits for it, so that no child writes into the folder during its removal.
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
  held.add(dir);
  const stop = (signal: NodeJS.Signals): void => {
    stopAfter(signal);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    run('git', ['archive', '--output', join(dir, 'ref.tar'), ref, ...(options.paths ?? [])], ROOT);
    run('tar', ['-xf', 'ref.tar'], dir);
    rmSync(join(dir, 'ref.tar'));
    return await use(dir);
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    held.delete(dir);
  }
}

/**
 * Builds the site of a commit in a temporary folder, and gives the folder to a function. The
 * folder gets the whole tree of the commit and a link to the `node_modules` of the repository.
 * Then `pnpm build` of the commit writes `dist/` there. The folder goes away at the end, also
 * after a failure or a stop.
 *
 * @param ref The commit, a branch, or a tag.
 * @param use The function that reads the folder and its `dist/`.
 * @param parent The folder that holds the temporary folder.
 * @returns The result of the function.
 * @throws Error if git does not know the ref, the build fails, or the function fails.
 */
export function withRefBuild<T>(
  ref: string,
  use: (dir: string) => Promise<T>,
  parent?: string,
): Promise<T> {
  const options: RefTreeOptions = parent
    ? { parent, prefix: 'ref-build-' }
    : { prefix: 'ref-build-' };
  return withRefTree(
    ref,
    async (dir) => {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
      await runChild('pnpm', ['run', 'build'], dir);
      return await use(dir);
    },
    options,
  );
}

/**
 * Gives the short hash of a commit.
 *
 * @param ref The commit, a branch, or a tag.
 * @returns The short hash.
 * @throws Error if git does not know the ref.
 */
export function shortHash(ref: string): string {
  const result = spawnSync('git', ['rev-parse', '--short', '--verify', `${ref}^{commit}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git does not know the commit "${ref}".`);
  }
  return result.stdout.trim();
}

/**
 * Gives the value of an option of the command line.
 *
 * @param args The arguments.
 * @param name The option, such as `--base`.
 * @returns The value, `null` when the option is not there, or `undefined` when it has no value.
 */
export function optionValue(args: readonly string[], name: string): string | null | undefined {
  const at = args.indexOf(name);
  if (at < 0) {
    return null;
  }
  const value = args[at + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

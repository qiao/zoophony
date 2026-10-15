/**
 * Puts the tree of a commit into a temporary folder, so that a tool can compare the working tree
 * with a commit, a branch, or a tag (`--base <ref>` of `pnpm body-probe`, `pnpm pose-depth`,
 * `pnpm hold-fit`, `pnpm size`, and `pnpm close-views`).
 */
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve as resolvePath, sep } from 'node:path';

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

/** A child process of {@link startChild} and the promise of its end. */
interface StartedChild {
  /** The child process. */
  readonly child: ChildProcess;
  /** A promise that resolves when the command ends with no failure. */
  readonly done: Promise<void>;
}

/**
 * Starts a command in a process group of its own, as {@link runChild} does, and gives the child
 * with the promise of its end.
 *
 * @param command The command.
 * @param args The arguments.
 * @param cwd The folder of the command.
 * @returns The child and the promise of its end.
 */
function startChild(command: string, args: readonly string[], cwd: string): StartedChild {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  running.add(child);
  const done = new Promise<void>((resolve, reject) => {
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
  return { child, done };
}

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
  return startChild(command, args, cwd).done;
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
 * The paths of a commit that a probe of the code of the commit reads: the source, the demos, the
 * rules of the demo patches, and the tools. The tools of the commit fit its source, such as the
 * export of the studio bodies of `tools/studio-body.ts`, which a newer tool can import from a
 * newer source.
 */
export const PROBE_PATHS: readonly string[] = [
  'src',
  'package.json',
  'demos/src',
  'demos/patches.json',
  'demos/README.md',
  'tools',
];

/**
 * Gives the scripts of `tools/` of the working tree that a probe of a commit copies: each script
 * that is not a test and that the commit does not have, such as a new probe of the working tree.
 *
 * @param files The names of the files of `tools/` of the working tree.
 * @param own The names of the files of `tools/` of the commit.
 * @returns The names of the scripts to copy, in their order.
 */
export function probeScripts(files: readonly string[], own: readonly string[]): string[] {
  return files.filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !own.includes(file),
  );
}

/** A table of roles of a tool, which a probe of a commit checks for its role. */
export interface RefRole {
  /** The role of the probe, such as `flutist`. */
  readonly name: string;
  /** The module of the table, relative to the tree, such as `tools/fold-probe.ts`. */
  readonly module: string;
  /** The exported table of the roles: a `Map` or an object with a key for each role. */
  readonly table: string;
}

/** The options of {@link withProbeTree}. */
export interface ProbeTreeOptions {
  /** The folder that holds the temporary folder. The default is the temporary folder of the OS. */
  readonly parent?: string;
  /** The start of the name of the temporary folder, such as `body-probe-`. */
  readonly prefix: string;
  /** The role of the probe, which the commit must have ({@link checkRefRole}). */
  readonly role?: RefRole;
}

/**
 * Reads the keys of a table of roles of a tree in a child process, so that the code of the commit
 * stays out of the process of the tool.
 *
 * @param dir The folder of the tree.
 * @param role The module and the table.
 * @returns The keys, or `null` when the tree has no such module or table, or the import fails.
 *   After INT or TERM, the tool removes each temporary folder and exits, as {@link run} does.
 */
export function refRoleKeys(dir: string, role: RefRole): string[] | null {
  const code = [
    `const table = (await import(${JSON.stringify(`./${role.module}`)}))[${JSON.stringify(role.table)}];`,
    'if (!table) { process.exit(2); }',
    'process.stdout.write(JSON.stringify(table instanceof Map ? [...table.keys()] : Object.keys(table)));',
  ].join('\n');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: dir,
    encoding: 'utf8',
  });
  if (result.signal === 'SIGINT' || result.signal === 'SIGTERM') {
    // The signal of a stop reached the child too, as in run(). The tool stops here, so that no
    // probe starts after the stop.
    stopNow(result.signal);
  }
  if (result.status !== 0) {
    return null;
  }
  // SAFETY: the child writes a JSON list of the keys of the table.
  const keys = JSON.parse(result.stdout) as unknown[];
  return keys.map(String);
}

/**
 * Checks that the tree of a commit has the role of a probe, before the probe starts.
 *
 * @param dir The folder of the tree of the commit.
 * @param ref The commit, a branch, or a tag, for the message.
 * @param role The role and its table.
 * @throws Error if the table of the commit has no such role. A tree with no such table passes,
 *   and the probe of the commit gives its own failure.
 */
export function checkRefRole(dir: string, ref: string, role: RefRole): void {
  const keys = refRoleKeys(dir, role);
  if (keys && !keys.includes(role.name)) {
    throw new Error(
      `The ref ${ref} has no role ${role.name}. Its roles are: ${keys.join(', ') || 'none'}.`,
    );
  }
}

/**
 * Extracts {@link PROBE_PATHS} of a commit into a new temporary folder with {@link withRefTree},
 * and gives the folder to a function. The tools come from the commit, so that each tool runs on
 * the source that it fits. The folder also gets a copy of each script of `tools/` of the working
 * tree that the commit does not have ({@link probeScripts}), and a link to the `node_modules` of
 * the repository. With a role, the commit must have it ({@link checkRefRole}). Thus a tool runs
 * there, in a child process of {@link runChild}, on the code and the demos of the commit. The copy
 * and the start of the function run before the first `await`, so the child runs beside the code of
 * the caller. The folder goes away at the end, also after a failure or a stop (INT or TERM).
 *
 * @param ref The commit, a branch, or a tag.
 * @param use The function that runs the probe in the folder.
 * @param options The parent folder, the start of the name, and the role.
 * @returns The result of the function.
 * @throws Error if git does not know the ref, if the commit has no role of the options, or if the
 *   function fails.
 */
export function withProbeTree<T>(
  ref: string,
  use: (dir: string) => Promise<T>,
  options: ProbeTreeOptions,
): Promise<T> {
  const tree: RefTreeOptions = options.parent
    ? { parent: options.parent, prefix: options.prefix, paths: PROBE_PATHS }
    : { prefix: options.prefix, paths: PROBE_PATHS };
  return withRefTree(
    ref,
    (dir) => {
      const own = readdirSync(join(dir, 'tools'));
      for (const file of probeScripts(readdirSync(join(ROOT, 'tools')), own)) {
        copyFileSync(join(ROOT, 'tools', file), join(dir, 'tools', file));
      }
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
      if (options.role) {
        checkRefRole(dir, ref, options.role);
      }
      return use(dir);
    },
    tree,
  );
}

/** The arguments of the two children of {@link probeBeside}. */
export interface BesideArgs {
  /** The arguments of the script on the code of the commit. */
  readonly base: readonly string[];
  /** The arguments of the script on the working tree. */
  readonly tree: readonly string[];
}

/** The output files of the two children of {@link probeBeside}. */
export interface BesideTexts {
  /** The text of the file of the script on the code of the commit. */
  readonly base: string;
  /** The text of the file of the script on the working tree. */
  readonly tree: string;
}

/**
 * Gives the format version of the JSON text of a probe: its field `version`. Each probe that a
 * `--base` compare reads writes the version of its format, and a change of the format takes the
 * next version. A text with no field has the version 1, the format of the probes before the field
 * (2026-10-15).
 *
 * @param text The JSON text of one object.
 * @returns The version.
 * @throws Error if the text holds no object, or a version that is not a whole number above 0.
 */
export function formatVersion(text: string): number {
  // SAFETY: the text comes from the --json output of a probe, and the checks below read the field.
  const parsed = JSON.parse(text) as { readonly version?: unknown } | null;
  if (!(parsed instanceof Object)) {
    throw new Error('The JSON text of the probe holds no object.');
  }
  const version = parsed.version ?? 1;
  if (!Number.isInteger(version) || Number(version) < 1) {
    throw new Error(`The JSON text of the probe has the version ${String(version)}.`);
  }
  return Number(version);
}

/**
 * Checks that the JSON texts of a probe on a commit and on the working tree have one format. Since
 * 94c6ace9, each side runs its own tool, so a branch that changes the format of a probe would give
 * false differences.
 *
 * @param script The script of the probe, such as `hold-fit.ts`.
 * @param ref The commit, the branch, or the tag, for the message.
 * @param base The format version of the text of the commit ({@link formatVersion}).
 * @param tree The format version of the text of the working tree.
 * @throws Error if the versions differ, with both versions.
 */
export function checkFormat(script: string, ref: string, base: number, tree: number): void {
  if (base !== tree) {
    throw new Error(
      `The JSON of tools/${script} on ${ref} has the format version ${base}, and the working tree has the format version ${tree}. A compare of two formats gives false differences, so compare with a commit whose tools/${script} writes the format version ${tree}.`,
    );
  }
}

/**
 * Runs a script of `tools/` on the code of a commit and on the working tree at the same time,
 * each in a child process of {@link runChild}. The first child runs in the folder of
 * {@link withProbeTree}, and the second child runs in the repository. Each child writes its
 * results into a file of the folder, which the option `--json <file>` names. The caller only
 * waits, so a stop (INT or TERM) ends both children at once, and removes the folder. A failure of
 * one child ends the other child at once. The two texts must have one format version
 * ({@link checkFormat}).
 *
 * @param ref The commit, a branch, or a tag.
 * @param script The script, such as `pose-depth.ts`.
 * @param args The arguments of each child, with no `--json`.
 * @param options The parent folder and the start of the name of the folder.
 * @returns The text of the file of each child.
 * @throws Error if git does not know the ref, if a child fails, or if the two texts have other
 *   format versions. Both children end first.
 */
export function probeBeside(
  ref: string,
  script: string,
  args: BesideArgs,
  options: ProbeTreeOptions,
): Promise<BesideTexts> {
  return withProbeTree(
    ref,
    async (dir) => {
      const files = { base: join(dir, 'base.json'), tree: join(dir, 'tree.json') };
      const children = {
        base: startChild(
          process.execPath,
          [join('tools', script), ...args.base, '--json', files.base],
          dir,
        ),
        tree: startChild(
          process.execPath,
          [join('tools', script), ...args.tree, '--json', files.tree],
          ROOT,
        ),
      };
      // A failure of one child ends the other at once, so the report of the failure comes early.
      const endOther =
        (other: StartedChild) =>
        async (error: Error): Promise<void> => {
          await endChild(other.child);
          throw error;
        };
      const [base, tree] = await Promise.allSettled([
        children.base.done.catch(endOther(children.tree)),
        children.tree.done.catch(endOther(children.base)),
      ]);
      if (base.status === 'rejected') {
        const reason: unknown = base.reason;
        throw new Error(
          `The probe of ${ref} failed: ${reason instanceof Error ? reason.message : String(reason)}`,
        );
      }
      if (tree.status === 'rejected') {
        throw tree.reason;
      }
      const texts = {
        base: await readFile(files.base, 'utf8'),
        tree: await readFile(files.tree, 'utf8'),
      };
      checkFormat(script, ref, formatVersion(texts.base), formatVersion(texts.tree));
      return texts;
    },
    options,
  );
}

/**
 * Removes options from the arguments of a command line, such as `--base <ref>` from the arguments
 * of a child.
 *
 * @param args The arguments.
 * @param valued The options to remove with their values.
 * @param flags The options with no value to remove.
 * @returns The other arguments, in their order.
 */
export function withoutOptions(
  args: readonly string[],
  valued: readonly string[],
  flags: readonly string[] = [],
): string[] {
  const kept: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (valued.includes(arg)) {
      i++;
    } else if (!flags.includes(arg)) {
      kept.push(arg);
    }
  }
  return kept;
}

/**
 * Checks the paths of an overlay before any removal: each path is relative, names a part of the
 * folder of the tree and not the whole folder, and is not under `node_modules`. A removal of
 * another path could reach a file next to the folder, or the real `node_modules` through its link.
 *
 * @param dir The folder of the tree of the commit.
 * @param paths The paths, such as `src/gallery`.
 * @returns The paths, relative to the folder, with no `.` or `..` part.
 * @throws Error for the first path that breaks a rule.
 */
export function overlayPaths(dir: string, paths: readonly string[]): string[] {
  return paths.map((path) => {
    if (isAbsolute(path)) {
      throw new Error(`The overlay path "${path}" is absolute.`);
    }
    const inside = relative(dir, resolvePath(dir, path));
    if (inside === '' || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
      throw new Error(`The overlay path "${path}" is not inside the tree of the commit.`);
    }
    if (inside.split(sep)[0] === 'node_modules') {
      throw new Error(`The overlay path "${path}" is under node_modules.`);
    }
    return inside;
  });
}

/**
 * Replaces paths of the tree of a commit with the paths of the working tree. A file that only the
 * commit has under such a path goes away. Each path must pass {@link overlayPaths} before the
 * first removal, and the tree must have no `node_modules` yet.
 *
 * @param dir The folder of the tree of the commit.
 * @param paths The paths, such as `src/gallery`.
 * @throws Error if a path breaks a rule of {@link overlayPaths}, or if the tree already has
 *   `node_modules`, such as the link of {@link withRefBuild}. Then nothing goes away.
 */
export function overlayTree(dir: string, paths: readonly string[]): void {
  const checked = overlayPaths(dir, paths);
  if (lstatSync(join(dir, 'node_modules'), { throwIfNoEntry: false })) {
    throw new Error('The tree of the commit has node_modules. Put the overlay in before the link.');
  }
  for (const path of checked) {
    rmSync(join(dir, path), { recursive: true, force: true });
    cpSync(join(ROOT, path), join(dir, path), { recursive: true });
  }
}

/**
 * Builds the site of a commit in a temporary folder, and gives the folder to a function. The
 * folder gets the whole tree of the commit and a link to the `node_modules` of the repository.
 * The paths of `overlay` come from the working tree in place of the commit, such as the gallery
 * page of a tool that needs the camera code of the working tree. They go in before the link
 * ({@link overlayTree}). Then `pnpm build` writes `dist/` there. The folder goes away at the end, also after a failure or a stop.
 *
 * @param ref The commit, a branch, or a tag.
 * @param use The function that reads the folder and its `dist/`.
 * @param parent The folder that holds the temporary folder.
 * @param overlay The paths of the working tree, such as `src/gallery`, that replace the paths of
 *   the commit.
 * @returns The result of the function.
 * @throws Error if git does not know the ref, the build fails, or the function fails.
 */
export function withRefBuild<T>(
  ref: string,
  use: (dir: string) => Promise<T>,
  parent?: string,
  overlay: readonly string[] = [],
): Promise<T> {
  const options: RefTreeOptions = parent
    ? { parent, prefix: 'ref-build-' }
    : { prefix: 'ref-build-' };
  return withRefTree(
    ref,
    async (dir) => {
      // The overlay comes before the link, so that no removal can follow the link.
      overlayTree(dir, overlay);
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

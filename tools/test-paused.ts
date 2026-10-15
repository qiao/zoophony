/**
 * Runs the paused tests of the project `paused` of `vite.config.ts` (design 9.3, decision
 * `2026-10-14-test-pause.md`). With no `--base`, it runs Vitest with the output of Vitest, and
 * exits with its exit code. With `--base <ref>`, it runs the paused tests on a temporary copy of a
 * commit, a branch, or a tag (`withRefTree()` of `tools/ref-tree.ts`) and on the working tree at
 * the same time, and prints only the tests that fail on the working tree alone. The copy goes away
 * at the end, also after a failure and after Ctrl-C.
 *
 * Usage: pnpm test:paused [--base <ref>] [<path>]...
 */
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync, symlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { ROOT, runChildren, shortHash, withRefTree } from './ref-tree.ts';
import type { ChildEnd } from './ref-tree.ts';

/** The usage text of `pnpm test:paused`. */
const USAGE = 'Usage: pnpm test:paused [--base <ref>] [<path>]...';

/** The script of Vitest in the packages of the working tree. */
const VITEST = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');

/**
 * The paths of a commit that the paused tests read: the source, the tools and the demo files that
 * the tests import, the design files that a test reads, and the config files of Vitest. A paused
 * test that reads another path fails on the copy of the commit, so its failure on the working tree
 * does not show. Add such a path here.
 */
export const PAUSED_PATHS: readonly string[] = [
  'src',
  'tools',
  'demos',
  'docs/design',
  'docs/decisions',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
];

/** The arguments of `pnpm test:paused`. */
export interface PausedArgs {
  /** The commit, the branch, or the tag of `--base`, or `null`. */
  readonly base: string | null;
  /** The test files to run, or none for all paused test files. */
  readonly paths: readonly string[];
}

/**
 * Reads the arguments of `pnpm test:paused`.
 *
 * @param args The arguments after the script.
 * @returns The ref of `--base` and the paths.
 * @throws Error if `--base` has no value or comes more than one time, or if an option is not
 *   known.
 */
export function parsePausedArgs(args: readonly string[]): PausedArgs {
  let base: string | null = null;
  const paths: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--base') {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--') || base !== null) {
        throw new Error(`The option --base takes one commit, branch, or tag.\n${USAGE}`);
      }
      base = value;
      i++;
    } else if (arg.startsWith('--')) {
      throw new Error(`The option "${arg}" is not known.\n${USAGE}`);
    } else {
      paths.push(arg);
    }
  }
  return { base, paths };
}

/**
 * Gives the arguments of Vitest for a run of the paused tests with the JSON report.
 *
 * @param json The file of the JSON report.
 * @param paths The test files, or none for all paused test files.
 * @returns The arguments after the script of Vitest. A path that the tree does not have runs no
 *   file, and the run passes with no test (`--passWithNoTests`).
 */
export function vitestArgs(json: string, paths: readonly string[]): string[] {
  return [
    'run',
    '--project',
    'paused',
    '--reporter=json',
    `--outputFile=${json}`,
    '--passWithNoTests',
    ...paths,
  ];
}

/** One test of the JSON report of Vitest. */
interface ReportTest {
  /** The names of the blocks and of the test, joined with spaces. */
  readonly fullName?: string;
  /** The status: `passed`, `failed`, `skipped`, and so on. */
  readonly status?: string;
}

/** One test file of the JSON report of Vitest. */
interface ReportFile {
  /** The absolute path of the file. */
  readonly name?: string;
  /** The status of the file: `failed` also when the file does not load. */
  readonly status?: string;
  /** The tests of the file. */
  readonly assertionResults?: readonly ReportTest[];
}

/**
 * Gives the failed tests of a JSON report of Vitest, each as `<file> > <full name>` with the path
 * of the file from the root of its tree. A file that fails with no failed test, such as a file
 * that does not load, gives `<file> > (the file fails with no failed test)`.
 *
 * @param text The JSON text of the report.
 * @param root The root of the tree of the run, with no link in it: Vitest gives the real path of
 *   each file, and the temporary folder of macOS is under a link.
 * @returns The failed tests, in the order of the report.
 * @throws Error if the text has no list of test files.
 */
export function failedTests(text: string, root: string): string[] {
  // SAFETY: the text is the JSON report of Vitest, and the check below reads the list of files.
  const report = JSON.parse(text) as { readonly testResults?: readonly ReportFile[] };
  if (!Array.isArray(report.testResults)) {
    throw new Error('The JSON report of Vitest has no list of test files.');
  }
  return report.testResults.flatMap((file) => {
    const path = relative(root, file.name ?? '');
    const tests: readonly ReportTest[] = file.assertionResults ?? [];
    const failed = tests.filter((test) => test.status === 'failed');
    if (failed.length === 0) {
      return file.status === 'failed' ? [`${path} > (the file fails with no failed test)`] : [];
    }
    return failed.map((test) => `${path} > ${test.fullName ?? ''}`);
  });
}

/**
 * Gives the tests that fail on the working tree alone: each failed test of the working tree that
 * does not fail on the commit, such as a test that passes on the commit or that the commit does
 * not have.
 *
 * @param base The failed tests of the commit ({@link failedTests}).
 * @param tree The failed tests of the working tree.
 * @returns The tests, in the order of the working tree.
 */
export function newFailures(base: readonly string[], tree: readonly string[]): string[] {
  const old = new Set(base);
  return tree.filter((test) => !old.has(test));
}

/**
 * Reads the failed tests of one run.
 *
 * @param name The name of the tree, for the message.
 * @param end The end of the run of Vitest.
 * @param json The file of the JSON report.
 * @param root The root of the tree of the run.
 * @returns The failed tests.
 * @throws Error if the run wrote no report, with the cause from the error output.
 */
async function runFailures(
  name: string,
  end: ChildEnd,
  json: string,
  root: string,
): Promise<string[]> {
  if (!existsSync(json)) {
    const cause = end.errors.trim().split('\n').slice(-20).join('\n');
    throw new Error(
      `The paused tests of ${name} wrote no report (exit code ${String(end.status)}):\n${cause}`,
    );
  }
  return failedTests(await readFile(json, 'utf8'), root);
}

/**
 * Runs the paused tests on a copy of a commit and on the working tree at the same time, each in a
 * child process of `runChildren()`, and prints the tests that fail on the working tree alone. When
 * one run cannot start, the other run ends first.
 * The copy holds {@link PAUSED_PATHS} of the commit and a link to the `node_modules` of the
 * working tree. The copy goes away at the end, also after a failure and after a stop (INT or
 * TERM), which ends both runs first.
 *
 * @param ref The commit, the branch, or the tag.
 * @param paths The test files, or none for all paused test files.
 * @returns The exit code: 1 when a test fails on the working tree alone, else 0.
 * @throws Error if git does not know the ref, or if a run writes no report.
 */
async function compareBase(ref: string, paths: readonly string[]): Promise<number> {
  const label = `${ref} (${shortHash(ref)})`;
  const started = performance.now();
  console.log(`Paused tests on ${label} and on the working tree, at the same time:`);
  return withRefTree(
    ref,
    async (dir) => {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
      const files = { base: join(dir, 'base.json'), tree: join(dir, 'tree.json') };
      // Both runs start before the first await, so a stop ends both.
      const [baseEnd, treeEnd] = await runChildren([
        { command: process.execPath, args: [VITEST, ...vitestArgs(files.base, paths)], cwd: dir },
        { command: process.execPath, args: [VITEST, ...vitestArgs(files.tree, paths)], cwd: ROOT },
      ]);
      if (!baseEnd || !treeEnd) {
        throw new Error('A run of the paused tests gave no end.');
      }
      const base = await runFailures(label, baseEnd, files.base, realpathSync(dir));
      const tree = await runFailures('the working tree', treeEnd, files.tree, realpathSync(ROOT));
      const fresh = newFailures(base, tree);
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      console.log(
        [
          `${label}: ${base.length} failed tests. The working tree: ${tree.length} failed tests. ${seconds} s.`,
          fresh.length > 0
            ? `Tests that fail on the working tree alone (${fresh.length}):`
            : 'No test fails on the working tree alone.',
          ...fresh.map((test) => `  ${test}`),
        ].join('\n'),
      );
      return fresh.length > 0 ? 1 : 0;
    },
    { prefix: 'test-paused-', paths: PAUSED_PATHS },
  );
}

/** Runs the tool: `node tools/test-paused.ts [--base <ref>] [<path>]...`. */
async function main(): Promise<void> {
  const { base, paths } = parsePausedArgs(process.argv.slice(2));
  if (base !== null) {
    process.exitCode = await compareBase(base, paths);
    return;
  }
  const result = spawnSync(process.execPath, [VITEST, 'run', '--project', 'paused', ...paths], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

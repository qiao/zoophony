/**
 * The Vitest reporter of `pnpm test:paused --base` (`tools/test-paused.ts`). At the end of a run,
 * it writes the file of `--outputFile` with the title path of each failed test, the unhandled
 * errors, and the reason of the end of the run. The JSON reporter of Vitest gives no unhandled
 * error, such as an unhandled rejection or a crash of a worker.
 */
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import type { Reporter, TestCase, TestModule, TestRunEndReason, Vitest } from 'vitest/node';

/** An unhandled error of a run, as Vitest gives it to a reporter. */
type UnhandledError = Parameters<NonNullable<Reporter['onTestRunEnd']>>[1][number];

/** The report of one run of the paused tests, as the reporter writes it. */
export interface PausedReport {
  /** The end of the run: `passed`, `failed`, or `interrupted`. */
  readonly reason: string;
  /**
   * The title path of each failed test: the file from the root of the run, the names of its
   * suites, and the name of the test.
   */
  readonly failed: readonly (readonly string[])[];
  /** The name and the first line of the message of each unhandled error, with `<root>` for the root. */
  readonly unhandled: readonly string[];
}

/**
 * Gives the first line of a message, with `<root>` in place of the root of the run, so that the
 * messages of two trees compare.
 *
 * @param message The message.
 * @param root The root of the run.
 * @returns The line.
 */
export function messageLine(message: string, root: string): string {
  return (message.split('\n')[0] ?? '').replaceAll(root, '<root>').trim();
}

/**
 * Gives the title path of a test: the file from the root of the run, the names of its suites from
 * the outside in, and the name of the test.
 *
 * @param test The test.
 * @param root The root of the run.
 * @returns The title path.
 */
function titlePath(test: TestCase, root: string): string[] {
  const names = [test.name];
  let parent = test.parent;
  while (parent.type === 'suite') {
    names.unshift(parent.name);
    parent = parent.parent;
  }
  return [relative(root, test.module.moduleId), ...names];
}

/**
 * Makes the report of a run.
 *
 * @param modules The test files of the run.
 * @param unhandled The unhandled errors of the run.
 * @param reason The reason of the end of the run.
 * @param root The root of the run.
 * @returns The report.
 */
export function pausedReport(
  modules: readonly TestModule[],
  unhandled: readonly UnhandledError[],
  reason: TestRunEndReason,
  root: string,
): PausedReport {
  return {
    reason,
    failed: modules.flatMap((module) =>
      [...module.children.allTests('failed')].map((test) => titlePath(test, root)),
    ),
    unhandled: unhandled.map(
      (error) => `${error.name ?? 'Error'}: ${messageLine(error.message ?? '', root)}`,
    ),
  };
}

/** The reporter: it writes the report of {@link pausedReport} into the file of `--outputFile`. */
export default class PausedReporter implements Reporter {
  /** The Vitest of the run, from `onInit()`. */
  #vitest: Vitest | null = null;

  /**
   * Keeps the Vitest of the run, for its root and its output file.
   *
   * @param vitest The Vitest of the run.
   */
  onInit(vitest: Vitest): void {
    this.#vitest = vitest;
  }

  /**
   * Writes the report of the run into the file of `--outputFile`.
   *
   * @param modules The test files of the run.
   * @param unhandled The unhandled errors of the run.
   * @param reason The reason of the end of the run.
   * @throws Error if the run has no output file.
   */
  onTestRunEnd(
    modules: readonly TestModule[],
    unhandled: readonly UnhandledError[],
    reason: TestRunEndReason,
  ): void {
    const config = this.#vitest?.config;
    const file = config?.outputFile;
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the config of Vitest is an I/O boundary.
    if (!config || typeof file !== 'string') {
      throw new Error('The paused reporter needs --outputFile=<file>.');
    }
    writeFileSync(file, JSON.stringify(pausedReport(modules, unhandled, reason, config.root)));
  }
}

/**
 * Gives the time and the test count of each test file from a JSON report of Vitest, and the
 * edits of each test file in the model rounds (the report `2026-10-14-test-pause.md`). Run from
 * the repository root:
 *
 * `pnpm exec vitest run --project <name> --reporter=json --outputFile=<report.json>`, then
 * `node docs/research/2026-10-14-test-pause/test-times.ts <report.json> [<since> <until> [<ref>]]`.
 *
 * The time of a file is the run time of its tests in its worker (`endTime - startTime` of the
 * report). It does not hold the import and the collection of the file. The edits count the
 * commits of the history of `<ref>` (HEAD by default) from `<since>` to `<until>` (2026-10-10 to
 * 2026-10-15 by default) that change the file. The report used the base `d46d7fbe`.
 * The probe prints one tab-separated row for each file, sorted by the path, then the totals. The
 * span is the time from the start of the run to the end of its last file, the "Duration" of the
 * default reporter of Vitest. The probe checks the sum of its counts against the total of the
 * report, and stops on a difference.
 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';

/** One test of a file in the JSON report of Vitest. */
interface AssertionResult {
  /** The state of the test: `passed`, `failed`, `skipped`, or `pending`. */
  readonly status: string;
}

/** One test file in the JSON report of Vitest. */
interface FileResult {
  /** The absolute path of the file. */
  readonly name: string;
  /** The start of the run of the file, in milliseconds since the epoch. */
  readonly startTime: number;
  /** The end of the run of the file, in milliseconds since the epoch. */
  readonly endTime: number;
  /** The tests of the file. */
  readonly assertionResults: readonly AssertionResult[];
}

/** The parts of the JSON report of Vitest that the probe reads. */
interface Report {
  /** The start of the run, in milliseconds since the epoch. */
  readonly startTime: number;
  /** The count of all tests. */
  readonly numTotalTests: number;
  /** The count of the passed tests. */
  readonly numPassedTests: number;
  /** The count of the failed tests. */
  readonly numFailedTests: number;
  /** The test files. */
  readonly testResults: readonly FileResult[];
}

const [reportPath, since = '2026-10-10 00:00', until = '2026-10-15 00:00', ref = 'HEAD'] =
  process.argv.slice(2);
if (!reportPath) {
  throw new Error('Give the path of a JSON report of Vitest.');
}

// SAFETY: the file is a JSON report that Vitest wrote with `--reporter=json`.
const report = JSON.parse(await readFile(reportPath, 'utf8')) as Report;

const log = execFileSync(
  'git',
  ['log', ref, `--since=${since}`, `--until=${until}`, '--name-only', '--format=', '--', '*.test.ts'],
  { encoding: 'utf8' },
);
const edits = new Map<string, number>();
for (const line of log.split('\n')) {
  if (line) {
    edits.set(line, (edits.get(line) ?? 0) + 1);
  }
}

const rows = report.testResults
  .map((file) => ({
    path: relative(process.cwd(), file.name),
    tests: file.assertionResults.length,
    failed: file.assertionResults.filter((test) => test.status === 'failed').length,
    seconds: (file.endTime - file.startTime) / 1000,
  }))
  .toSorted((a, b) => a.path.localeCompare(b.path));

console.log(['file', 'seconds', 'tests', 'failed', 'edits'].join('\t'));
for (const row of rows) {
  const edited = edits.get(row.path) ?? 0;
  console.log([row.path, row.seconds.toFixed(2), row.tests, row.failed, edited].join('\t'));
}

const tests = rows.reduce((sum, row) => sum + row.tests, 0);
const seconds = rows.reduce((sum, row) => sum + row.seconds, 0);
const end = Math.max(...report.testResults.map((file) => file.endTime));
console.log(
  `files ${rows.length}, tests ${tests}, passed ${report.numPassedTests}, ` +
    `failed ${report.numFailedTests}, file seconds ${seconds.toFixed(1)}, ` +
    `span ${((end - report.startTime) / 1000).toFixed(1)}`,
);
if (tests !== report.numTotalTests) {
  throw new Error(`The files hold ${tests} tests, and the report counts ${report.numTotalTests}.`);
}

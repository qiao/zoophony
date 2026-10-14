import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { breakVerdict } from './break-test.ts';
import type { VitestFileResult } from './break-test.ts';

/** The result of one run of the script. */
interface RunResult {
  /** The exit code. */
  readonly status: number | null;
  /** The output and the error output. */
  readonly output: string;
}

/** The script under test. */
const SCRIPT = join(import.meta.dirname, 'break-test.sh');

/**
 * A fake `pnpm` for `pnpm exec vitest run --reporter=json --outputFile=<file> <tests>`. It writes a
 * report with one test, which fails when `lib.txt` holds the word `BROKEN` or the folder holds
 * the file `fail`. With the file `crash` in the folder, it fails with no report. With the file
 * `slow`, it writes the file `started` beside it and waits 30 s.
 */
const FAKE_PNPM = `#!/bin/sh
out=''
for arg in "$@"; do case "$arg" in --outputFile=*) out="\${arg#--outputFile=}";; esac; done
if [ -f slow ]; then echo started > "$(dirname "$0")/started"; exec sleep 30; fi
if [ -f crash ]; then echo 'Error: the run crashes' >&2; exit 1; fi
if grep -q BROKEN lib.txt || [ -f fail ]; then status=failed; else status=passed; fi
printf '{"testResults":[{"name":"%s/lib.test.ts","status":"%s","message":"","assertionResults":[{"ancestorTitles":["lib"],"title":"keeps the word ok","status":"%s"}]}]}' "$(pwd -P)" "$status" "$status" > "$out"
[ "$status" = passed ]
`;

/** The temporary folder of the test. */
let root = '';

/** The repository of the test. */
let repo = '';

/** The folder of the fake `pnpm`. */
let bin = '';

/** The committed text of `lib.txt`. */
const LIB = 'export const word = "ok";\n';

/**
 * Gives the environment of the commands: the fake `pnpm` first on the path, and no git
 * configuration of the user.
 *
 * @returns The environment.
 */
function environment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith('GIT_')) {
      env[name] = value;
    }
  }
  env['PATH'] = `${bin}:${process.env['PATH'] ?? ''}`;
  env['TMPDIR'] = root;
  env['GIT_CONFIG_GLOBAL'] = '/dev/null';
  env['GIT_CONFIG_NOSYSTEM'] = '1';
  env['GIT_AUTHOR_NAME'] = 'Test';
  env['GIT_AUTHOR_EMAIL'] = 'test@example.invalid';
  env['GIT_COMMITTER_NAME'] = 'Test';
  env['GIT_COMMITTER_EMAIL'] = 'test@example.invalid';
  return env;
}

/**
 * Runs the script in the repository of the test.
 *
 * @param args The arguments of the script.
 * @returns The exit code and the output.
 */
function breakTest(...args: readonly string[]): RunResult {
  const result = spawnSync('bash', [SCRIPT, ...args], {
    cwd: repo,
    env: environment(),
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Reads `lib.txt` of the repository of the test.
 *
 * @returns The text.
 */
function lib(): string {
  return readFileSync(join(repo, 'lib.txt'), 'utf8');
}

describe('breakVerdict', () => {
  const file = (result: Partial<VitestFileResult>): VitestFileResult => ({
    name: '/repo/src/a.test.ts',
    status: 'passed',
    message: '',
    assertionResults: [],
    ...result,
  });

  it('names each failed test with its file and its describe blocks', () => {
    const report = {
      testResults: [
        file({
          status: 'failed',
          assertionResults: [
            { ancestorTitles: ['outer', 'inner'], title: 'keeps a rule', status: 'failed' },
            { ancestorTitles: ['outer'], title: 'keeps another rule', status: 'passed' },
          ],
        }),
      ],
    };
    expect(breakVerdict(report, '/repo')).toEqual({
      lines: ['Tests that fail (1):', 'src/a.test.ts > outer > inner > keeps a rule'],
      exitCode: 0,
    });
  });

  it('counts a test file that does not load as a failure', () => {
    const message = "Cannot find module './gone.ts'\n  at the import";
    const report = { testResults: [file({ status: 'failed', message })] };
    expect(breakVerdict(report, '/repo').lines).toEqual([
      'Tests that fail (1):',
      "src/a.test.ts: the file fails before its tests: Cannot find module './gone.ts'",
    ]);
  });

  it('says that no test fails, with the counts, and exits with 1', () => {
    const passed = { ancestorTitles: [], title: 'passes', status: 'passed' };
    const report = { testResults: [file({ assertionResults: [passed, passed] })] };
    expect(breakVerdict(report, '/repo')).toEqual({
      lines: ['No test fails (2 tests in 1 files).'],
      exitCode: 1,
    });
  });

  it('exits with 2 when no test ran', () => {
    expect(breakVerdict({ testResults: [] }, '/repo').exitCode).toBe(2);
  });
});

describe('tools/break-test.sh', () => {
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'break-test-test-'));
    repo = join(root, 'repo');
    bin = join(root, 'bin');
    mkdirSync(repo);
    mkdirSync(bin);
    writeFileSync(join(bin, 'pnpm'), FAKE_PNPM);
    chmodSync(join(bin, 'pnpm'), 0o755);
    spawnSync('git', ['init', '-q'], { cwd: repo, env: environment() });
    writeFileSync(join(repo, 'lib.txt'), LIB);
    spawnSync('git', ['add', 'lib.txt'], { cwd: repo, env: environment() });
    spawnSync('git', ['commit', '-q', '-m', 'add lib.txt'], { cwd: repo, env: environment() });
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('prints the test that finds the break, exits with 0, and restores the file', () => {
    const result = breakTest('s/"ok"/"BROKEN"/', 'lib.txt', 'lib.test.ts');
    expect(result.output).toContain('lib.test.ts > lib > keeps the word ok');
    expect(result.status).toBe(0);
    expect(lib()).toBe(LIB);
  });

  it('says that no test fails, exits with 1, and restores the file', () => {
    const result = breakTest('s/"ok"/"fine"/', 'lib.txt', 'lib.test.ts');
    expect(result.output).toContain('No test fails');
    expect(result.status).toBe(1);
    expect(lib()).toBe(LIB);
  });

  it('stops when the expression changes nothing', () => {
    const result = breakTest('s/absent/BROKEN/', 'lib.txt', 'lib.test.ts');
    expect(result.output).toContain('changes nothing');
    expect(result.status).toBe(2);
    expect(lib()).toBe(LIB);
  });

  it('refuses a file with changes that are not committed, and keeps the changes', () => {
    writeFileSync(join(repo, 'lib.txt'), `${LIB}// work in progress\n`);
    try {
      const result = breakTest('s/"ok"/"BROKEN"/', 'lib.txt', 'lib.test.ts');
      expect(result.output).toContain('not committed');
      expect(result.status).toBe(2);
      expect(lib()).toBe(`${LIB}// work in progress\n`);
    } finally {
      writeFileSync(join(repo, 'lib.txt'), LIB);
    }
  });

  it('restores the file after a test run with no report', () => {
    writeFileSync(join(repo, 'crash'), '');
    try {
      const result = breakTest('s/"ok"/"BROKEN"/', 'lib.txt', 'lib.test.ts');
      expect(result.output).toContain('Error: the run crashes');
      expect(result.status).toBe(2);
      expect(lib()).toBe(LIB);
    } finally {
      rmSync(join(repo, 'crash'));
    }
  });

  it('restores the file after Ctrl-C', async () => {
    writeFileSync(join(repo, 'slow'), '');
    try {
      const child = spawn('bash', [SCRIPT, 's/"ok"/"BROKEN"/', 'lib.txt', 'lib.test.ts'], {
        cwd: repo,
        env: environment(),
        detached: true,
        stdio: 'ignore',
      });
      const closed = new Promise<number | null>((resolve) => {
        child.on('close', (status) => resolve(status));
      });
      for (let i = 0; i < 200 && !existsSync(join(bin, 'started')); i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(lib()).toContain('BROKEN');
      // Ctrl-C sends INT to each process of the group of the terminal.
      process.kill(-(child.pid ?? 0), 'SIGINT');
      expect(await closed).toBe(130);
      expect(lib()).toBe(LIB);
    } finally {
      rmSync(join(repo, 'slow'));
    }
  });

  it('gives the verdict of the reader as it was before the break', () => {
    const tools = join(repo, 'tools');
    mkdirSync(tools, { recursive: true });
    copyFileSync(SCRIPT, join(tools, 'break-test.sh'));
    copyFileSync(join(import.meta.dirname, 'break-test.ts'), join(tools, 'break-test.ts'));
    const git = (...args: readonly string[]): void => {
      spawnSync('git', args, { cwd: repo, env: environment() });
    };
    git('add', 'tools');
    git('commit', '-q', '-m', 'add the break script');
    writeFileSync(join(repo, 'fail'), '');
    try {
      const result = spawnSync(
        'bash',
        ['tools/break-test.sh', 's/Tests that fail/Tests that pass/', 'tools/break-test.ts', 'x'],
        { cwd: repo, env: environment(), encoding: 'utf8' },
      );
      expect(`${result.stdout}${result.stderr}`).toContain('Tests that fail (1):');
      expect(result.status).toBe(0);
      expect(readFileSync(join(tools, 'break-test.ts'), 'utf8')).toContain('Tests that fail');
    } finally {
      rmSync(join(repo, 'fail'));
    }
  });
});

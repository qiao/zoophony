import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** The result of one run of a command. */
interface RunResult {
  /** The exit code. */
  readonly status: number | null;
  /** The output and the error output. */
  readonly output: string;
}

/**
 * A fake `pnpm`. It writes each call with the short hash of HEAD into `pnpm.log` beside it, and it
 * fails the typecheck when the tree has the file `broken`.
 */
const FAKE_PNPM = `#!/bin/sh
echo "$(git rev-parse --short HEAD) $*" >> "$(dirname "$0")/pnpm.log"
if [ "$2" = typecheck ] && [ -f broken ]; then exit 1; fi
exit 0
`;

/** The temporary folder of the test. */
let root = '';

/** The repository of the test. */
let repo = '';

/** The folder of the fake `pnpm`. */
let bin = '';

/**
 * Gives the environment of the commands: the fake `pnpm` first on the path, a fixed author, and
 * no git configuration of the user.
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
 * Runs a command in the repository of the test.
 *
 * @param command The command.
 * @param args The arguments.
 * @returns The exit code and the output.
 */
function run(command: string, args: readonly string[]): RunResult {
  const result = spawnSync(command, args, { cwd: repo, env: environment(), encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Writes a file into the repository and commits it.
 *
 * @param path The path in the repository.
 * @param text The text of the file.
 * @returns The short hash of the commit.
 */
function commitFile(path: string, text: string): string {
  mkdirSync(join(repo, path, '..'), { recursive: true });
  writeFileSync(join(repo, path), text);
  run('git', ['add', path]);
  run('git', ['commit', '-q', '-m', `add ${path}`]);
  return run('git', ['rev-parse', '--short', 'HEAD']).output.trim();
}

/**
 * Runs the check script.
 *
 * @param args The arguments of the script.
 * @returns The exit code and the output.
 */
function checkCommits(...args: readonly string[]): RunResult {
  return run('bash', ['tools/check-commits.sh', ...args, 'base']);
}

/**
 * Gives the names of the cache entries.
 *
 * @returns The names.
 */
function entries(): string[] {
  const cache = join(repo, '.git', 'check-cache');
  return existsSync(cache) ? readdirSync(cache) : [];
}

/**
 * Gives the calls of the fake `pnpm` for one commit.
 *
 * @param short The short hash of the commit.
 * @returns The arguments of each call.
 */
function pnpmCalls(short: string): string[] {
  const log = join(bin, 'pnpm.log');
  const lines = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
  return lines
    .filter((line) => line.startsWith(`${short} `))
    .map((line) => line.slice(short.length + 1));
}

/** The short hashes of the commits of the branch. */
const commits = { code: '', docs: '' };

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'check-commits-test-'));
  repo = join(root, 'repo');
  bin = join(root, 'bin');
  mkdirSync(join(repo, 'tools'), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(bin, 'pnpm'), FAKE_PNPM);
  chmodSync(join(bin, 'pnpm'), 0o755);
  for (const file of ['check-commits.sh', 'check-cache.ts']) {
    copyFileSync(join(import.meta.dirname, file), join(repo, 'tools', file));
  }

  run('git', ['init', '-q', '-b', 'main']);
  run('git', ['add', 'tools']);
  commitFile('src/reads-docs.test.ts', "readFileSync('docs/a.md');\n");
  run('git', ['branch', 'base']);
  commits.code = commitFile('src/a.ts', 'export const A = 1;\n');
  commits.docs = commitFile('docs/a.md', '# A\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('tools/check-commits.sh', () => {
  it('checks each commit, and keeps an entry for each passed commit', () => {
    const result = checkCommits();

    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(new RegExp(`${commits.code} lint [\\d.]+s, typecheck`));
    expect(entries()).toHaveLength(2);
    expect(pnpmCalls(commits.code)).toEqual([
      '-s lint',
      '-s typecheck',
      '-s test --changed HEAD~1 --passWithNoTests',
      '-s format:check',
    ]);
  });

  it('runs only the format check and the tests that read docs on a commit of docs', () => {
    expect(pnpmCalls(commits.docs)).toEqual(['-s test src/reads-docs.test.ts', '-s format:check']);
  });

  it('runs no check of a commit with an entry', () => {
    const before = pnpmCalls(commits.code).length;
    const result = checkCommits();

    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain(`${commits.code} hit`);
    expect(result.output).toContain(`${commits.docs} hit`);
    expect(pnpmCalls(commits.code)).toHaveLength(before);
  });

  it('runs each check again with --no-cache', () => {
    const before = pnpmCalls(commits.code).length;
    const result = checkCommits('--no-cache');

    expect(result.status, result.output).toBe(0);
    expect(pnpmCalls(commits.code)).toHaveLength(before + 4);
  });

  it('runs the full suite on the last commit with --tip', () => {
    const result = checkCommits('--tip');

    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(new RegExp(`tip ${commits.docs} full suite [\\d.]+s`));
    expect(pnpmCalls(commits.docs)).toContain('-s test');
    expect(entries()).toHaveLength(3);
  });

  it('stops at a failed check, writes no entry, and keeps the branch', () => {
    const broken = commitFile('broken', 'x\n');
    const head = run('git', ['rev-parse', 'HEAD']).output;
    const result = checkCommits();

    expect(result.status, result.output).toBe(3);
    expect(result.output).toContain(`RED ${broken} typecheck failed`);
    expect(entries()).toHaveLength(3);
    expect(run('git', ['rev-parse', 'HEAD']).output).toBe(head);
    expect(run('git', ['status', '--porcelain']).output).toBe('');
    expect(existsSync(join(repo, '.git', 'rebase-merge'))).toBe(false);
  });

  it('refuses a working tree with changes', () => {
    writeFileSync(join(repo, 'src', 'b.ts'), 'export const B = 2;\n');
    const result = checkCommits();
    rmSync(join(repo, 'src', 'b.ts'));

    expect(result.status).toBe(1);
    expect(result.output).toContain('src/b.ts');
  });
});

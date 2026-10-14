/**
 * Checks the stop of a tool with `--base` after Ctrl-C through pnpm, as a terminal sends it: INT
 * to the process group of pnpm, then a second INT to pnpm 100 ms later. It prints the temporary
 * folders and the child processes during the run, the exit code and the time of the stop, and
 * the folders and the processes that remain. Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-14-size-retro/stop-check.ts <folder prefix> <wait s> <pnpm args>
 *
 * For example: `stop-check.ts pose-depth- 6 pose-depth violinist --demo beethoven-8 --base main`.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const [prefix = '', waitText = '8', ...args] = process.argv.slice(2);
const before = new Set(readdirSync(tmpdir()));
const child = spawn('pnpm', args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.setEncoding('utf8').on('data', (text: string) => {
  output += text;
});
child.stderr.setEncoding('utf8').on('data', (text: string) => {
  output += text;
});
const closed = new Promise<string>((resolve) => {
  child.on('close', (code, signal) => {
    resolve(code === null ? `signal ${signal ?? ''}` : String(code));
  });
});

/**
 * Lists the new temporary folders of the run.
 *
 * @returns The names of the folders.
 */
function folders(): string[] {
  return readdirSync(tmpdir()).filter((name) => !before.has(name) && name.startsWith(prefix));
}

/**
 * Lists the processes whose command line holds a text.
 *
 * @param text The text.
 * @returns The lines of `pgrep -fl`.
 */
function processes(text: string): string {
  return spawnSync('pgrep', ['-fl', text], { encoding: 'utf8' }).stdout.trim();
}

await new Promise((resolve) => setTimeout(resolve, Number(waitText) * 1000));
const marker = `tools/${args[0] ?? ''}.ts`;
console.log(`folders during the run: ${folders().join(', ') || 'none'}`);
console.log(`processes during the run:\n${processes(marker) || 'none'}`);

const started = Date.now();
process.kill(-(child.pid ?? 0), 'SIGINT');
await new Promise((resolve) => setTimeout(resolve, 100));
try {
  process.kill(child.pid ?? 0, 'SIGINT');
} catch {
  // pnpm has ended.
}
const code = await closed;
await new Promise((resolve) => setTimeout(resolve, 500));
console.log(`exit code of pnpm: ${code}, after ${Date.now() - started} ms`);
console.log(`folders left: ${folders().join(', ') || 'none'}`);
console.log(`processes left: ${processes(marker) || 'none'}`);
console.log(`last lines: ${output.trim().split('\n').slice(-2).join(' | ')}`);

// Stops pnpm test:paused --base HEAD with INT after 6 s, for item 7 of the report.
// Run it from the repository root: node docs/research/2026-10-15-fit-retro/stop-paused.ts

import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const before = readdirSync(tmpdir()).filter((n) => n.startsWith('test-paused-'));
const child = spawn(process.execPath, ['tools/test-paused.ts', '--base', 'HEAD'], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
child.stdout.on('data', (t) => (out += t));
child.stderr.on('data', (t) => (out += t));
const started = Date.now();
await new Promise((r) => setTimeout(r, 6000));
const during = readdirSync(tmpdir()).filter((n) => n.startsWith('test-paused-') && !before.includes(n));
const vitests = spawnSync('pgrep', ['-g', String(child.pid)]).stdout.toString().trim().split('\n').length;
process.kill(-(child.pid ?? 0), 'SIGINT');
const code = await new Promise((r) => child.on('close', (c, s) => r(c ?? s)));
await new Promise((r) => setTimeout(r, 500));
const after = readdirSync(tmpdir()).filter((n) => n.startsWith('test-paused-') && !before.includes(n));
const left = spawnSync('pgrep', ['-f', 'vitest.mjs run --project paused']).stdout.toString().trim();
console.log(JSON.stringify({ code, seconds: (Date.now() - started) / 1000, during, groupProcesses: vitests, after, left, out }));

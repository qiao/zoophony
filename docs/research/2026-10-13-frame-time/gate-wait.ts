/**
 * Compares the two gates of the main-thread phase of `pnpm frame` on the same load (the report
 * `2026-10-13-frame-retro.md`). Run from the repository root, for example right after a run of
 * `pnpm frame`: `node docs/research/2026-10-13-frame-time/gate-wait.ts [<limit s>]`.
 *
 * Every 5 s, the probe prints the CPU use of all cores over the 5 s (`cpuUse()` of
 * `tools/measure-frame.ts`) and the 1-minute load average. It ends when the CPU use is at most
 * `MAX_CPU` and the load average is at most 8 (the gate before the round `frame-tools`), or after
 * the limit (600 s). It prints the time until each gate passes.
 */
import { cpus, loadavg } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

import { MAX_CPU, cpuUse } from '../../../tools/measure-frame.ts';

/** The highest 1-minute load average of the old gate. */
const OLD_MAX_LOAD = 8;

const limitSec = Number(process.argv[2] ?? 600);
const start = Date.now();
let cpuPass: number | null = null;
let loadPass: number | null = null;
while ((cpuPass === null || loadPass === null) && Date.now() - start < limitSec * 1000) {
  const before = cpus();
  await delay(5000);
  const use = cpuUse(before, cpus());
  const load = loadavg()[0] ?? 0;
  const seconds = (Date.now() - start) / 1000;
  if (cpuPass === null && use <= MAX_CPU) {
    cpuPass = seconds;
  }
  if (loadPass === null && load <= OLD_MAX_LOAD) {
    loadPass = seconds;
  }
  console.log(
    `${seconds.toFixed(0)} s: CPU use ${use.toFixed(0)}%, load average ${load.toFixed(1)}`,
  );
}
const text = (pass: number | null): string =>
  pass === null ? `no pass in ${limitSec} s` : `${pass.toFixed(0)} s`;
console.log(`CPU gate (at most ${MAX_CPU}% over 5 s): ${text(cpuPass)}.`);
console.log(`Old load gate (load average at most ${OLD_MAX_LOAD}): ${text(loadPass)}.`);

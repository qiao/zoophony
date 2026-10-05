// The entry of the jsc bundle (vite.jsc.config.mjs). Arguments after "--": the data folder,
// the options of runBench as JSON, and the number of runs.

import './jsc-polyfill.ts';
import { runBench } from './bench.ts';
import type { BenchInput } from './bench.ts';

declare function readFile(path: string, mode?: 'binary'): string & Uint8Array;
declare function preciseTime(): number;
declare function print(...values: unknown[]): void;

const args = (globalThis as unknown as { arguments: string[] }).arguments;
const dir = args[0] ?? 'page/data';
const options = JSON.parse(args[1] ?? '{}');
const runs = Number(args[2] ?? 1);
const data = JSON.parse(readFile(`${dir}/score.json`));
const input: BenchInput = {
  durationSec: data.durationSec,
  events: data.events,
  banks: data.banks.map((bank: { id: string; file: string }) => {
    const bytes = readFile(`${dir}/${bank.file}`, 'binary');
    return { id: bank.id, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
  }),
};
for (let run = 0; run < runs; run++) {
  print(runBench(input, () => preciseTime() * 1000, { ...options, label: `${options.label} ${run}` }));
}

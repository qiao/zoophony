// Runs bench.ts in Node with the data of prepare.ts.
//
// Usage: node docs/research/scripts/webkit-audio/node-main.ts '{"label":"node"}' 2

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runBench } from './bench.ts';

const dir = join(import.meta.dirname, 'page/data');
const options = JSON.parse(process.argv[2] ?? '{}');
const runs = Number(process.argv[3] ?? 1);
const data = JSON.parse(readFileSync(join(dir, 'score.json'), 'utf8'));
const banks = data.banks.map((bank: { id: string; file: string }) => {
  const bytes = readFileSync(join(dir, bank.file));
  return { id: bank.id, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
});
for (let run = 0; run < runs; run++) {
  const label = `${options.label ?? 'node'} ${run}`;
  console.log(runBench({ ...data, banks }, () => performance.now(), { ...options, label }));
}
